import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Game } from './models/Game.mjs';
import { Progress } from './models/Progress.mjs';
import { User } from './models/User.mjs';
import { Friendship } from './models/Friendship.mjs';
import { hashPassword, optionalAuth, requireAuth, signToken, verifyPassword } from './auth.mjs';
import { SKIN_CATALOG, SKIN_MAP } from './skins.mjs';
import crypto from 'crypto';
import http from 'http';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

let currentUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chess_coach';
let lastDbError = null;

async function ensureAdminAccount() {
  try {
    const allSkinIds = SKIN_CATALOG.map((s) => s.id);
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@chesscoach.local',
        displayName: 'Quản trị viên (Admin)',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        elo: 2500,
        points: 9999,
        coins: 99999,
        ownedSkins: allSkinIds,
      });
      await Progress.findOneAndUpdate(
        { profileId: `user:${adminUser._id}` },
        { $setOnInsert: { profileId: `user:${adminUser._id}`, solvedPuzzles: [], completedOpenings: [] } },
        { upsert: true }
      );
      console.log('👑 Đã tạo tài khoản Quản lý mặc định: admin / admin123');
    } else if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
  } catch (err) {
    console.warn('⚠️ Không thể khởi tạo tài khoản admin:', err?.message || err);
  }
}

async function connectMongo(uri) {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    currentUri = uri;
    lastDbError = null;
    console.log('✅ Đã kết nối MongoDB:', mongoose.connection.name);
    await ensureAdminAccount();
    return { ok: true, dbName: mongoose.connection.name };
  } catch (err) {
    lastDbError = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ Chưa kết nối được MongoDB:', lastDbError);
    return { ok: false, error: lastDbError };
  }
}

function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Chưa kết nối được MongoDB. Hãy kiểm tra chuỗi MONGODB_URI trong Cài đặt hoặc file .env.',
      details: lastDbError,
    });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    dbConnected: mongoose.connection.readyState === 1,
    dbName: mongoose.connection.readyState === 1 ? mongoose.connection.name : null,
    error: lastDbError,
  });
});

app.post('/api/config/mongodb', async (req, res) => {
  const { uri } = req.body || {};
  if (!uri || typeof uri !== 'string') {
    return res.status(400).json({ error: 'Thiếu chuỗi kết nối MongoDB URI.' });
  }
  const trimmed = uri.trim();
  const result = await connectMongo(trimmed);
  if (result.ok) {
    try {
      const content = `MONGODB_URI=${trimmed}\nPORT=${PORT}\n`;
      fs.writeFileSync(envPath, content, 'utf8');
    } catch {
      // ignore if .env cannot be written
    }
    return res.json({ ok: true, dbName: result.dbName });
  }
  return res.status(400).json({ ok: false, error: result.error });
});

function sanitizeUser(userDoc) {
  return {
    id: String(userDoc._id),
    username: userDoc.username,
    email: userDoc.email,
    displayName: userDoc.displayName || userDoc.username,
    role: userDoc.role || 'user',
    elo: userDoc.elo ?? 1200,
    points: userDoc.points ?? 0,
    coins: userDoc.coins ?? 50,
    wins: userDoc.wins ?? 0,
    gamesPlayed: userDoc.gamesPlayed ?? 0,
    winStreak: userDoc.winStreak ?? 0,
    bestStreak: userDoc.bestStreak ?? 0,
    dailyStreak: userDoc.dailyStreak ?? 0,
    ownedSkins: userDoc.ownedSkins || ['piece:classic', 'board:default'],
    equippedPieceSkin: userDoc.equippedPieceSkin || 'classic',
    equippedBoardSkin: userDoc.equippedBoardSkin || 'default',
    equippedEffectSkin: userDoc.equippedEffectSkin || 'none',
    createdAt: userDoc.createdAt,
  };
}

function getScope(req) {
  if (req.user?.id) {
    return {
      userObjectId: new mongoose.Types.ObjectId(req.user.id),
      profileId: `user:${req.user.id}`,
    };
  }
  return {
    userObjectId: null,
    profileId: 'default',
  };
}

// --- Auth Routes ---
app.post('/api/auth/register', requireDb, async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body || {};
    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const cleanDisplayName = String(displayName || '').trim() || cleanUsername;

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Tên đăng nhập phải từ 3 đến 30 ký tự.' });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Tên đăng nhập chỉ gồm chữ, số và ký tự _ . -' });
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    }).lean();
    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(409).json({ error: 'Email này đã được đăng ký.' });
      }
      return res.status(409).json({ error: 'Tên đăng nhập này đã tồn tại.' });
    }

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      displayName: cleanDisplayName,
      passwordHash: hashPassword(cleanPassword),
    });

    await Progress.create({
      profileId: `user:${user._id}`,
      solvedPuzzles: [],
      completedOpenings: [],
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Lỗi đăng ký tài khoản.' });
  }
});

app.post('/api/auth/login', requireDb, async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const cleanId = String(identifier || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanId || !cleanPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.' });
    }

    const user = await User.findOne({
      $or: [{ username: cleanId }, { email: cleanId.toLowerCase() }],
    });

    if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Lỗi đăng nhập.' });
  }
});

app.get('/api/auth/me', requireDb, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/auth/profile', requireDb, requireAuth, async (req, res) => {
  try {
    const { displayName } = req.body || {};
    const cleanName = String(displayName || '').trim();
    if (!cleanName || cleanName.length > 40) {
      return res.status(400).json({ error: 'Tên hiển thị phải từ 1 đến 40 ký tự.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { displayName: cleanName } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Friends Routes ---
function formatPublicUser(userDoc) {
  return {
    id: String(userDoc._id),
    username: userDoc.username,
    displayName: userDoc.displayName || userDoc.username,
    role: userDoc.role || 'user',
    elo: userDoc.elo ?? 1200,
  };
}

app.get('/api/friends', requireDb, requireAuth, async (req, res) => {
  try {
    const meId = new mongoose.Types.ObjectId(req.user.id);
    const docs = await Friendship.find({
      $or: [{ requester: meId }, { recipient: meId }],
    })
      .populate('requester', 'username displayName elo')
      .populate('recipient', 'username displayName elo')
      .sort({ updatedAt: -1 })
      .lean();

    const friends = [];
    const incoming = [];
    const outgoing = [];

    for (const doc of docs) {
      if (!doc.requester || !doc.recipient) continue;
      const isRequester = String(doc.requester._id) === req.user.id;
      const other = isRequester ? doc.recipient : doc.requester;
      const item = {
        friendshipId: String(doc._id),
        user: formatPublicUser(other),
        createdAt: doc.createdAt,
      };
      if (doc.status === 'accepted') {
        friends.push(item);
      } else if (isRequester) {
        outgoing.push(item);
      } else {
        incoming.push(item);
      }
    }

    return res.json({ friends, incoming, outgoing });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/friends/search', requireDb, requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const meId = new mongoose.Types.ObjectId(req.user.id);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = {
      _id: { $ne: meId },
      ...(escaped
        ? {
            $or: [
              { username: { $regex: escaped, $options: 'i' } },
              { displayName: { $regex: escaped, $options: 'i' } },
            ],
          }
        : {}),
    };

    const users = await User.find(filter)
      .select('username displayName elo')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const userIds = users.map((u) => u._id);
    const relations = await Friendship.find({
      $or: [
        { requester: meId, recipient: { $in: userIds } },
        { recipient: meId, requester: { $in: userIds } },
      ],
    }).lean();

    const relMap = new Map();
    for (const r of relations) {
      const isReq = String(r.requester) === req.user.id;
      const otherId = String(isReq ? r.recipient : r.requester);
      relMap.set(otherId, {
        friendshipId: String(r._id),
        status:
          r.status === 'accepted'
            ? 'friends'
            : isReq
              ? 'pending_sent'
              : 'pending_received',
      });
    }

    const results = users.map((u) => {
      const rel = relMap.get(String(u._id));
      return {
        ...formatPublicUser(u),
        relation: rel?.status || 'none',
        friendshipId: rel?.friendshipId || null,
      };
    });

    return res.json({ users: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/request', requireDb, requireAuth, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
    }
    if (String(targetUserId) === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự kết bạn với chính mình.' });
    }

    const target = await User.findById(targetUserId).lean();
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const meId = new mongoose.Types.ObjectId(req.user.id);
    const targetId = new mongoose.Types.ObjectId(targetUserId);

    const existing = await Friendship.findOne({
      $or: [
        { requester: meId, recipient: targetId },
        { requester: targetId, recipient: meId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ error: 'Hai bạn đã là bạn bè.' });
      }
      // If the other person already sent a request to me, auto-accept
      if (String(existing.recipient) === req.user.id) {
        existing.status = 'accepted';
        await existing.save();
        return res.json({ ok: true, status: 'accepted', friendshipId: String(existing._id) });
      }
      return res.status(409).json({ error: 'Đã gửi lời mời kết bạn trước đó.' });
    }

    const doc = await Friendship.create({
      requester: meId,
      recipient: targetId,
      status: 'pending',
    });

    return res.status(201).json({ ok: true, status: 'pending', friendshipId: String(doc._id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/respond', requireDb, requireAuth, async (req, res) => {
  try {
    const { friendshipId, action } = req.body || {};
    if (!friendshipId || !mongoose.Types.ObjectId.isValid(friendshipId)) {
      return res.status(400).json({ error: 'friendshipId không hợp lệ.' });
    }
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'Hành động không hợp lệ.' });
    }

    const doc = await Friendship.findById(friendshipId);
    if (!doc) {
      return res.status(404).json({ error: 'Không tìm thấy lời mời kết bạn.' });
    }
    if (String(doc.recipient) !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền phản hồi lời mời này.' });
    }

    if (action === 'accept') {
      doc.status = 'accepted';
      await doc.save();
      return res.json({ ok: true, status: 'accepted' });
    }

    await doc.deleteOne();
    return res.json({ ok: true, status: 'declined' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/friends/:friendshipId', requireDb, requireAuth, async (req, res) => {
  try {
    const { friendshipId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(friendshipId)) {
      return res.status(400).json({ error: 'friendshipId không hợp lệ.' });
    }
    const doc = await Friendship.findById(friendshipId);
    if (!doc) {
      return res.status(404).json({ error: 'Không tìm thấy kết nối bạn bè.' });
    }
    if (String(doc.requester) !== req.user.id && String(doc.recipient) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xóa.' });
    }
    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/games', requireDb, optionalAuth, async (req, res) => {
  try {
    const { userObjectId } = getScope(req);
    const games = await Game.find({ userId: userObjectId })
      .select('-moves')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/:id', requireDb, optionalAuth, async (req, res) => {
  try {
    const { userObjectId } = getScope(req);
    const game = await Game.findOne({ _id: req.params.id, userId: userObjectId }).lean();
    if (!game) return res.status(404).json({ error: 'Không tìm thấy ván đấu.' });
    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

app.post('/api/games', requireDb, optionalAuth, async (req, res) => {
  try {
    const { userObjectId } = getScope(req);
    const game = await Game.create({ ...req.body, userId: userObjectId });

    let reward = null;
    let updatedUser = null;

    if (req.user?.id && req.body?.mode === 'play' && req.body?.winner && req.body.winner !== 'none') {
      const user = await User.findById(req.user.id);
      if (user) {
        const winner = req.body.winner;
        let newWinStreak = user.winStreak || 0;
        let coinsEarned = 10;
        let pointsEarned = 10;
        let eloDelta = 0;

        if (winner === 'player') {
          newWinStreak = (user.winStreak || 0) + 1;
          const streakBonus = Math.min(newWinStreak - 1, 10);
          coinsEarned = 50 + streakBonus * 10;
          pointsEarned = 100 + streakBonus * 15;
          eloDelta = 15;
          user.wins = (user.wins || 0) + 1;
        } else if (winner === 'draw') {
          coinsEarned = 20;
          pointsEarned = 30;
        } else {
          newWinStreak = 0;
          coinsEarned = 10;
          pointsEarned = 10;
          eloDelta = -8;
        }

        const today = getDateKey();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = getDateKey(yesterdayDate);

        if (user.lastPlayedDay === today) {
          // already counted today
        } else if (user.lastPlayedDay === yesterday) {
          user.dailyStreak = (user.dailyStreak || 0) + 1;
        } else {
          user.dailyStreak = 1;
        }
        user.lastPlayedDay = today;

        user.winStreak = newWinStreak;
        user.bestStreak = Math.max(user.bestStreak || 0, newWinStreak);
        user.gamesPlayed = (user.gamesPlayed || 0) + 1;
        user.coins = (user.coins ?? 50) + coinsEarned;
        user.points = (user.points || 0) + pointsEarned;
        user.elo = Math.max(400, (user.elo || 1200) + eloDelta);

        if (!user.dailyQuests || user.dailyQuests.date !== today) {
          user.dailyQuests = { date: today, gamesPlayed: 0, wins: 0, puzzlesSolved: 0, claimedIds: [] };
        }
        user.dailyQuests.gamesPlayed = (user.dailyQuests.gamesPlayed || 0) + 1;
        if (winner === 'player') {
          user.dailyQuests.wins = (user.dailyQuests.wins || 0) + 1;
        }

        await user.save();
        updatedUser = sanitizeUser(user);
        reward = {
          coinsEarned,
          pointsEarned,
          eloDelta,
          winStreak: user.winStreak,
          bestStreak: user.bestStreak,
          dailyStreak: user.dailyStreak,
        };
      }
    }

    res.status(201).json({ game, reward, user: updatedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Leaderboard & Skin Shop ---
app.get('/api/leaderboard', requireDb, async (req, res) => {
  try {
    const users = await User.find()
      .select('username displayName elo points wins gamesPlayed winStreak bestStreak dailyStreak')
      .sort({ points: -1, elo: -1, wins: -1 })
      .limit(30)
      .lean();

    const entries = users.map((u, idx) => ({
      rank: idx + 1,
      id: String(u._id),
      username: u.username,
      displayName: u.displayName || u.username,
      elo: u.elo ?? 1200,
      points: u.points ?? 0,
      wins: u.wins ?? 0,
      gamesPlayed: u.gamesPlayed ?? 0,
      winStreak: u.winStreak ?? 0,
      bestStreak: u.bestStreak ?? 0,
      dailyStreak: u.dailyStreak ?? 0,
    }));

    return res.json({ leaderboard: entries });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/shop/buy', requireDb, requireAuth, async (req, res) => {
  try {
    const { skinId } = req.body || {};
    const skin = SKIN_MAP.get(String(skinId || ''));
    if (!skin) {
      return res.status(404).json({ error: 'Không tìm thấy skin này.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const owned = new Set(user.ownedSkins || ['piece:classic', 'board:default']);
    if (owned.has(skin.id)) {
      return res.status(409).json({ error: 'Bạn đã sở hữu skin này rồi.' });
    }

    const balance = user.coins ?? 50;
    if (balance < skin.price) {
      return res.status(400).json({ error: `Không đủ Xu! Cần ${skin.price} Xu (bạn có ${balance} Xu).` });
    }

    user.coins = balance - skin.price;
    user.ownedSkins = [...owned, skin.id];
    if (skin.category === 'piece') {
      user.equippedPieceSkin = skin.key;
    } else if (skin.category === 'board') {
      user.equippedBoardSkin = skin.key;
    } else {
      user.equippedEffectSkin = skin.key;
    }
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/shop/equip', requireDb, requireAuth, async (req, res) => {
  try {
    const { category, skinKey } = req.body || {};
    if (category !== 'piece' && category !== 'board' && category !== 'effect') {
      return res.status(400).json({ error: 'Danh mục skin không hợp lệ.' });
    }
    const fullId = `${category}:${skinKey}`;
    const skin = SKIN_MAP.get(fullId);
    if (!skin) {
      return res.status(404).json({ error: 'Skin không tồn tại.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const owned = new Set(user.ownedSkins || ['piece:classic', 'board:default']);
    if (user.role !== 'admin' && skin.price > 0 && !owned.has(fullId)) {
      return res.status(403).json({ error: 'Bạn chưa sở hữu skin này.' });
    }

    if (category === 'piece') {
      user.equippedPieceSkin = skin.key;
    } else if (category === 'board') {
      user.equippedBoardSkin = skin.key;
    } else {
      user.equippedEffectSkin = skin.key;
    }
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Admin Management Routes ---
async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).select('role').lean();
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ tài khoản Quản lý (Admin) mới có quyền truy cập.' });
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
}

app.get('/api/admin/overview', requireDb, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalGames, totalFriendships, users, recentGames] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments(),
      Friendship.countDocuments(),
      User.find().select('-passwordHash').sort({ createdAt: -1 }).lean(),
      Game.find()
        .select('-moves')
        .populate('userId', 'username displayName')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalGames,
        totalFriendships,
        dbName: mongoose.connection.name,
      },
      users: users.map(sanitizeUser),
      recentGames: recentGames.map((g) => ({
        _id: String(g._id),
        title: g.title,
        mode: g.mode,
        result: g.result,
        winner: g.winner,
        aiElo: g.aiElo,
        createdAt: g.createdAt,
        ownerName: g.userId ? g.userId.displayName || g.userId.username : 'Khách',
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:userId', requireDb, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'userId không hợp lệ.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const { role, coins, points, elo, winStreak, dailyStreak, displayName, grantAllSkins } = req.body || {};
    if (role === 'user' || role === 'admin') {
      if (String(user._id) === req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'Không thể tự hạ quyền admin của chính mình.' });
      }
      user.role = role;
    }
    if (typeof coins === 'number' && Number.isFinite(coins)) user.coins = Math.max(0, Math.round(coins));
    if (typeof points === 'number' && Number.isFinite(points)) user.points = Math.max(0, Math.round(points));
    if (typeof elo === 'number' && Number.isFinite(elo)) user.elo = Math.max(400, Math.round(elo));
    if (typeof winStreak === 'number' && Number.isFinite(winStreak)) {
      user.winStreak = Math.max(0, Math.round(winStreak));
      user.bestStreak = Math.max(user.bestStreak || 0, user.winStreak);
    }
    if (typeof dailyStreak === 'number' && Number.isFinite(dailyStreak)) {
      user.dailyStreak = Math.max(0, Math.round(dailyStreak));
    }
    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim().slice(0, 40);
    }
    if (grantAllSkins) {
      user.ownedSkins = SKIN_CATALOG.map((s) => s.id);
    }

    await user.save();
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:userId', requireDb, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'userId không hợp lệ.' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự xóa tài khoản quản lý đang đăng nhập.' });
    }
    const uid = new mongoose.Types.ObjectId(userId);
    await Promise.all([
      User.findByIdAndDelete(uid),
      Game.deleteMany({ userId: uid }),
      Progress.deleteMany({ profileId: `user:${userId}` }),
      Friendship.deleteMany({ $or: [{ requester: uid }, { recipient: uid }] }),
    ]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/games/:gameId', requireDb, requireAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: 'gameId không hợp lệ.' });
    }
    await Game.findByIdAndDelete(gameId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Matchmaking, Tournaments & Private Rooms ---
const privateRooms = new Map();
const TOURNAMENTS = [
  {
    id: 'tour-bullet-arena',
    name: 'Bullet Arena Siêu Tốc',
    timeControl: '1 phút',
    format: 'Arena 30 phút',
    playersCount: 48,
    maxPlayers: 100,
    prizeCoins: 300,
    status: 'Đang mở đăng ký',
    joinedUsers: new Set(),
  },
  {
    id: 'tour-blitz-cup',
    name: 'Giải Cờ Chớp Cuối Tuần',
    timeControl: '3 | 2',
    format: 'Swiss 7 vòng',
    playersCount: 32,
    maxPlayers: 64,
    prizeCoins: 500,
    status: 'Bắt đầu sau 15 phút',
    joinedUsers: new Set(),
  },
  {
    id: 'tour-rapid-grand',
    name: 'Rapid Championship 10+0',
    timeControl: '10 phút',
    format: 'Swiss 5 vòng',
    playersCount: 24,
    maxPlayers: 50,
    prizeCoins: 800,
    status: 'Đang mở đăng ký',
    joinedUsers: new Set(),
  },
];

const MATCHMAKING_BOT_NAMES = [
  { name: 'MinhKhang_VN', elo: 1180 },
  { name: 'ThanhTung99', elo: 1245 },
  { name: 'GrandMaster_HN', elo: 1320 },
  { name: 'LinhChi_Chess', elo: 1150 },
  { name: 'HoangAnh_Pro', elo: 1290 },
];

app.post('/api/matchmaking/find', optionalAuth, (req, res) => {
  const { timeControl = '1 phút' } = req.body || {};
  const pick = MATCHMAKING_BOT_NAMES[Math.floor(Math.random() * MATCHMAKING_BOT_NAMES.length)];
  const color = Math.random() < 0.5 ? 'w' : 'b';
  res.json({
    matchId: crypto.randomBytes(6).toString('hex'),
    timeControl,
    opponent: {
      name: pick.name,
      elo: pick.elo,
    },
    playerColor: color,
  });
});

app.get('/api/tournaments', optionalAuth, (req, res) => {
  const uid = req.user?.id || 'guest';
  res.json({
    tournaments: TOURNAMENTS.map((t) => ({
      id: t.id,
      name: t.name,
      timeControl: t.timeControl,
      format: t.format,
      playersCount: t.playersCount + t.joinedUsers.size,
      maxPlayers: t.maxPlayers,
      prizeCoins: t.prizeCoins,
      status: t.status,
      joined: t.joinedUsers.has(uid),
    })),
  });
});

app.post('/api/tournaments/:id/join', optionalAuth, (req, res) => {
  const tour = TOURNAMENTS.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Không tìm thấy giải đấu.' });
  const uid = req.user?.id || req.ip || 'guest';
  tour.joinedUsers.add(uid);
  res.json({
    ok: true,
    playersCount: tour.playersCount + tour.joinedUsers.size,
  });
});

app.post('/api/rooms', optionalAuth, (req, res) => {
  const { timeControl = '10 phút', hostColor = 'w' } = req.body || {};
  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = {
    roomId,
    timeControl,
    hostColor,
    hostName: req.user?.username || 'Kỳ thủ',
    createdAt: Date.now(),
  };
  privateRooms.set(roomId, room);
  res.status(201).json({ room });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = privateRooms.get(String(req.params.roomId || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại hoặc đã đóng.' });
  res.json({ room });
});

app.delete('/api/games/:id', requireDb, optionalAuth, async (req, res) => {
  try {
    const { userObjectId } = getScope(req);
    await Game.findOneAndDelete({ _id: req.params.id, userId: userObjectId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress', requireDb, optionalAuth, async (req, res) => {
  try {
    const { userObjectId, profileId } = getScope(req);
    let progress = await Progress.findOne({ profileId }).lean();
    if (!progress) {
      progress = await Progress.create({ profileId });
    }
    const [totalGames, wins, statsAgg] = await Promise.all([
      Game.countDocuments({ mode: 'play', userId: userObjectId }),
      Game.countDocuments({ mode: 'play', winner: 'player', userId: userObjectId }),
      Game.aggregate([
        { $match: { mode: 'play', userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalBlunders: { $sum: '$blunders' },
            totalMistakes: { $sum: '$mistakes' },
            avgCpLoss: { $avg: '$avgCpLoss' },
          },
        },
      ]),
    ]);
    const agg = statsAgg[0] || { totalBlunders: 0, totalMistakes: 0, avgCpLoss: 0 };
    res.json({
      solvedPuzzles: progress.solvedPuzzles || [],
      completedOpenings: progress.completedOpenings || [],
      stats: {
        totalGames,
        wins,
        totalBlunders: agg.totalBlunders,
        totalMistakes: agg.totalMistakes,
        avgCpLoss: Math.round(agg.avgCpLoss || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress/puzzle', requireDb, optionalAuth, async (req, res) => {
  const { puzzleId } = req.body || {};
  if (!puzzleId) return res.status(400).json({ error: 'Thiếu puzzleId' });
  try {
    const { profileId } = getScope(req);
    const progress = await Progress.findOneAndUpdate(
      { profileId },
      { $addToSet: { solvedPuzzles: puzzleId } },
      { upsert: true, new: true }
    ).lean();
    if (req.user?.id) {
      const today = getDateKey();
      const user = await User.findById(req.user.id);
      if (user) {
        if (!user.dailyQuests || user.dailyQuests.date !== today) {
          user.dailyQuests = { date: today, gamesPlayed: 0, wins: 0, puzzlesSolved: 0, claimedIds: [] };
        }
        user.dailyQuests.puzzlesSolved = (user.dailyQuests.puzzlesSolved || 0) + 1;
        await user.save();
      }
    }
    res.json({ solvedPuzzles: progress.solvedPuzzles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Daily Quests ---
const DAILY_QUESTS = [
  { id: 'play_2', title: 'Chơi 2 ván đấu', field: 'gamesPlayed', target: 2, rewardCoins: 40, rewardPoints: 50 },
  { id: 'win_1', title: 'Giành 1 chiến thắng', field: 'wins', target: 1, rewardCoins: 60, rewardPoints: 80 },
  { id: 'puzzle_2', title: 'Giải 2 thế cờ chiến thuật', field: 'puzzlesSolved', target: 2, rewardCoins: 50, rewardPoints: 60 },
];

app.get('/api/quests', requireDb, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    const today = getDateKey();
    if (!user.dailyQuests || user.dailyQuests.date !== today) {
      user.dailyQuests = { date: today, gamesPlayed: 0, wins: 0, puzzlesSolved: 0, claimedIds: [] };
      await user.save();
    }
    const qState = user.dailyQuests;
    const claimed = new Set(qState.claimedIds || []);
    const quests = DAILY_QUESTS.map((q) => ({
      id: q.id,
      title: q.title,
      progress: Math.min(q.target, qState[q.field] || 0),
      target: q.target,
      rewardCoins: q.rewardCoins,
      rewardPoints: q.rewardPoints,
      claimed: claimed.has(q.id),
    }));
    res.json({ quests, date: today });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quests/claim', requireDb, requireAuth, async (req, res) => {
  try {
    const { questId } = req.body || {};
    const def = DAILY_QUESTS.find((q) => q.id === questId);
    if (!def) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    const today = getDateKey();
    if (!user.dailyQuests || user.dailyQuests.date !== today) {
      return res.status(400).json({ error: 'Nhiệm vụ chưa được hoàn thành hôm nay.' });
    }
    const currentProgress = user.dailyQuests[def.field] || 0;
    if (currentProgress < def.target) {
      return res.status(400).json({ error: 'Bạn chưa hoàn thành mục tiêu nhiệm vụ này.' });
    }
    const claimed = new Set(user.dailyQuests.claimedIds || []);
    if (claimed.has(def.id)) {
      return res.status(409).json({ error: 'Bạn đã nhận thưởng nhiệm vụ này rồi.' });
    }

    claimed.add(def.id);
    user.dailyQuests.claimedIds = [...claimed];
    user.coins = (user.coins ?? 50) + def.rewardCoins;
    user.points = (user.points || 0) + def.rewardPoints;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress/opening', requireDb, optionalAuth, async (req, res) => {
  const { openingId } = req.body || {};
  if (!openingId) return res.status(400).json({ error: 'Thiếu openingId' });
  try {
    const { profileId } = getScope(req);
    const progress = await Progress.findOneAndUpdate(
      { profileId },
      { $addToSet: { completedOpenings: openingId } },
      { upsert: true, new: true }
    ).lean();
    res.json({ completedOpenings: progress.completedOpenings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const wsRooms = new Map(); // roomId -> Set<WebSocket>

wss.on('connection', (ws) => {
  ws.roomId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'join_room' && msg.roomId) {
        const rid = String(msg.roomId).toUpperCase();
        if (ws.roomId && wsRooms.has(ws.roomId)) {
          wsRooms.get(ws.roomId).delete(ws);
        }
        ws.roomId = rid;
        if (!wsRooms.has(rid)) wsRooms.set(rid, new Set());
        const peers = wsRooms.get(rid);
        peers.add(ws);
        const assignedColor = peers.size === 1 ? 'w' : 'b';
        ws.send(JSON.stringify({ type: 'joined', roomId: rid, color: assignedColor, players: peers.size }));
        for (const peer of peers) {
          if (peer !== ws && peer.readyState === 1) {
            peer.send(JSON.stringify({ type: 'peer_joined', players: peers.size }));
          }
        }
      } else if ((msg.type === 'move' || msg.type === 'resign') && ws.roomId && wsRooms.has(ws.roomId)) {
        for (const peer of wsRooms.get(ws.roomId)) {
          if (peer !== ws && peer.readyState === 1) {
            peer.send(JSON.stringify(msg));
          }
        }
      }
    } catch {
      // ignore malformed ws message
    }
  });

  ws.on('close', () => {
    if (ws.roomId && wsRooms.has(ws.roomId)) {
      const peers = wsRooms.get(ws.roomId);
      peers.delete(ws);
      if (peers.size === 0) wsRooms.delete(ws.roomId);
    }
  });
});

// Serve built frontend (dist/) in production when available
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api|\/ws).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🚀 Chess Coach API + WebSocket chạy tại http://localhost:${PORT}`);
  connectMongo(currentUri);
});
