import type { MoveRecord, PlayerColor } from '../types/chess';

const AUTH_TOKEN_KEY = 'chess_coach_auth_token';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  elo: number;
  points: number;
  coins: number;
  wins: number;
  gamesPlayed: number;
  winStreak: number;
  bestStreak: number;
  dailyStreak: number;
  ownedSkins: string[];
  equippedPieceSkin: string;
  equippedBoardSkin: string;
  equippedEffectSkin: string;
  createdAt?: string;
}

export interface GameReward {
  coinsEarned: number;
  pointsEarned: number;
  eloDelta: number;
  winStreak: number;
  bestStreak: number;
  dailyStreak: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  elo: number;
  points: number;
  wins: number;
  gamesPlayed: number;
  winStreak: number;
  bestStreak: number;
  dailyStreak: number;
}

export interface TournamentItem {
  id: string;
  name: string;
  timeControl: string;
  format: string;
  playersCount: number;
  maxPlayers: number;
  prizeCoins: number;
  status: string;
  joined: boolean;
}

export interface PrivateRoomInfo {
  roomId: string;
  timeControl: string;
  hostColor: PlayerColor;
  hostName: string;
  createdAt: number;
}

export interface DailyQuestItem {
  id: string;
  title: string;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardPoints: number;
  claimed: boolean;
}

export interface AdminOverview {
  stats: {
    totalUsers: number;
    totalGames: number;
    totalFriendships: number;
    dbName: string;
  };
  users: AuthUser[];
  recentGames: {
    _id: string;
    title: string;
    mode: string;
    result: string;
    winner: string;
    aiElo: number;
    createdAt: string;
    ownerName: string;
  }[];
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  elo: number;
}

export interface FriendRelationItem {
  friendshipId: string;
  user: PublicUser;
  createdAt: string;
}

export interface UserSearchResult extends PublicUser {
  relation: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  friendshipId: string | null;
}

export interface FriendsOverview {
  friends: FriendRelationItem[];
  incoming: FriendRelationItem[];
  outgoing: FriendRelationItem[];
}

export interface DbHealth {
  ok: boolean;
  dbConnected: boolean;
  dbName: string | null;
  error: string | null;
}

export interface SavedGameSummary {
  _id: string;
  title: string;
  mode: string;
  playerColor: PlayerColor;
  aiElo: number;
  result: string;
  winner: 'player' | 'ai' | 'draw' | 'none';
  blunders: number;
  mistakes: number;
  avgCpLoss: number;
  createdAt: string;
}

export interface SavedGameFull extends SavedGameSummary {
  startFen: string;
  finalFen: string;
  moves: MoveRecord[];
}

export interface UserProgress {
  solvedPuzzles: string[];
  completedOpenings: string[];
  stats: {
    totalGames: number;
    wins: number;
    totalBlunders: number;
    totalMistakes: number;
    avgCpLoss: number;
  };
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const dbApi = {
  getToken(): string | null {
    return getStoredToken();
  },

  logout() {
    setStoredToken(null);
  },

  async register(payload: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Đăng ký thất bại');
    }
    setStoredToken(data.token);
    return data;
  },

  async login(payload: { identifier: string; password: string }): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<AuthUser | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) setStoredToken(null);
        return null;
      }
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async updateProfile(displayName: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Cập nhật thất bại');
    }
    return data.user;
  },

  async getHealth(): Promise<DbHealth> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return { ok: false, dbConnected: false, dbName: null, error: 'API không phản hồi' };
      return await res.json();
    } catch {
      return { ok: false, dbConnected: false, dbName: null, error: 'Backend chưa chạy' };
    }
  },

  async connectMongo(uri: string): Promise<{ ok: boolean; dbName?: string; error?: string }> {
    const res = await fetch('/api/config/mongodb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return await res.json();
  },

  async getGames(): Promise<SavedGameSummary[]> {
    const res = await fetch('/api/games', { headers: authHeaders() });
    if (!res.ok) throw new Error('Không tải được danh sách ván đấu');
    const data = await res.json();
    return data.games || [];
  },

  async getGameById(id: string): Promise<SavedGameFull> {
    const res = await fetch(`/api/games/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Không tải được ván đấu');
    const data = await res.json();
    return data.game;
  },

  async saveGame(payload: {
    title: string;
    mode: string;
    playerColor: PlayerColor;
    aiElo: number;
    result: string;
    winner: 'player' | 'ai' | 'draw' | 'none';
    startFen: string;
    finalFen: string;
    blunders: number;
    mistakes: number;
    avgCpLoss: number;
    moves: MoveRecord[];
  }): Promise<{ game: SavedGameFull; reward?: GameReward | null; user?: AuthUser | null }> {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi lưu ván đấu');
    }
    const data = await res.json();
    return { game: data.game, reward: data.reward || null, user: data.user || null };
  },

  async deleteGame(id: string): Promise<void> {
    await fetch(`/api/games/${id}`, { method: 'DELETE', headers: authHeaders() });
  },

  async getProgress(): Promise<UserProgress> {
    const res = await fetch('/api/progress', { headers: authHeaders() });
    if (!res.ok) throw new Error('Không tải được tiến độ');
    return await res.json();
  },

  async markPuzzleSolved(puzzleId: string): Promise<string[]> {
    const res = await fetch('/api/progress/puzzle', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ puzzleId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.solvedPuzzles || [];
  },

  async markOpeningCompleted(openingId: string): Promise<string[]> {
    const res = await fetch('/api/progress/opening', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ openingId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.completedOpenings || [];
  },

  async getFriends(): Promise<FriendsOverview> {
    const res = await fetch('/api/friends', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không tải được danh sách bạn bè');
    return data;
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Lỗi tìm kiếm người dùng');
    return data.users || [];
  },

  async sendFriendRequest(targetUserId: string): Promise<{ status: string }> {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không gửi được lời mời kết bạn');
    return data;
  },

  async respondFriendRequest(friendshipId: string, action: 'accept' | 'decline'): Promise<void> {
    const res = await fetch('/api/friends/respond', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ friendshipId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không phản hồi được lời mời');
  },

  async removeFriend(friendshipId: string): Promise<void> {
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không xóa được bạn bè');
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetch('/api/leaderboard');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không tải được bảng xếp hạng');
    return data.leaderboard || [];
  },

  async buySkin(skinId: string): Promise<AuthUser> {
    const res = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ skinId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không mua được skin');
    return data.user;
  },

  async equipSkin(category: 'piece' | 'board' | 'effect', skinKey: string): Promise<AuthUser> {
    const res = await fetch('/api/shop/equip', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ category, skinKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không trang bị được skin');
    return data.user;
  },

  async adminGetOverview(): Promise<AdminOverview> {
    const res = await fetch('/api/admin/overview', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không tải được dữ liệu quản trị');
    return data;
  },

  async adminUpdateUser(
    userId: string,
    patch: {
      role?: 'user' | 'admin';
      coins?: number;
      points?: number;
      elo?: number;
      winStreak?: number;
      dailyStreak?: number;
      displayName?: string;
      grantAllSkins?: boolean;
    }
  ): Promise<AuthUser> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không cập nhật được tài khoản');
    return data.user;
  },

  async adminDeleteUser(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không xóa được tài khoản');
  },

  async adminDeleteGame(gameId: string): Promise<void> {
    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không xóa được ván đấu');
  },

  async findMatch(timeControl: string): Promise<{
    matchId: string;
    timeControl: string;
    opponent: { name: string; elo: number };
    playerColor: PlayerColor;
  }> {
    const res = await fetch('/api/matchmaking/find', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ timeControl }),
    });
    if (!res.ok) throw new Error('Lỗi kết nối server ghép trận');
    return await res.json();
  },

  async getTournaments(): Promise<TournamentItem[]> {
    const res = await fetch('/api/tournaments', { headers: authHeaders() });
    if (!res.ok) throw new Error('Không tải được danh sách giải đấu');
    const data = await res.json();
    return data.tournaments || [];
  },

  async joinTournament(id: string): Promise<{ ok: boolean; playersCount: number }> {
    const res = await fetch(`/api/tournaments/${id}/join`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Không thể tham gia giải đấu');
    return await res.json();
  },

  async createRoom(timeControl: string, hostColor: PlayerColor = 'w'): Promise<PrivateRoomInfo> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ timeControl, hostColor }),
    });
    if (!res.ok) throw new Error('Không tạo được phòng');
    const data = await res.json();
    return data.room;
  },

  async getRoom(roomId: string): Promise<PrivateRoomInfo> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
    if (!res.ok) throw new Error('Không tìm thấy phòng');
    const data = await res.json();
    return data.room;
  },

  async getQuests(): Promise<DailyQuestItem[]> {
    const res = await fetch('/api/quests', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không tải được nhiệm vụ');
    return data.quests || [];
  },

  async claimQuest(questId: string): Promise<AuthUser> {
    const res = await fetch('/api/quests/claim', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ questId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không nhận được thưởng');
    return data.user;
  },
};
