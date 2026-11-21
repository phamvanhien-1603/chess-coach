import React, { useEffect, useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Check,
  Loader2,
  Pencil,
  Flame,
  Zap,
  Crown,
} from 'lucide-react';
import { dbApi, type AuthUser, type PlayerProfileStats } from '../services/dbApi';
import { useI18n } from '../i18n/I18nContext';

interface AuthModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  onLogout: () => void;
}

function getTitleFromElo(elo: number, role?: string): string {
  if (role === 'admin') return 'GM · ADMIN';
  if (elo >= 2400) return 'GM';
  if (elo >= 2200) return 'IM';
  if (elo >= 2000) return 'FM';
  if (elo >= 1700) return 'CM';
  if (elo >= 1400) return 'PRO';
  return 'PLAYER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  currentUser,
  onClose,
  onAuthSuccess,
  onLogout,
}) => {
  const { lang } = useI18n();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [profileStats, setProfileStats] = useState<PlayerProfileStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && currentUser) {
      setStatsLoading(true);
      dbApi
        .getProfileStats(currentUser.id)
        .then(setProfileStats)
        .catch(() => setProfileStats(null))
        .finally(() => setStatsLoading(false));
    }
  }, [open, currentUser]);

  if (!open) return null;

  const resetMessages = () => setError(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const { user } = await dbApi.login({ identifier, password });
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await dbApi.register({
        username,
        email,
        password,
        displayName: displayName || undefined,
      });
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const updated = await dbApi.updateProfile({
        displayName: editName,
        country: editCountry,
      });
      onAuthSuccess(updated);
      setEditingProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    const rec = profileStats?.record;
    const total = rec?.totalGames ?? currentUser.gamesPlayed ?? 0;
    const wins = rec?.wins ?? currentUser.wins ?? 0;
    const draws = rec?.draws ?? 0;
    const losses = rec?.losses ?? Math.max(0, total - wins - draws);
    const winPct = total > 0 ? (wins / total) * 100 : 0;
    const drawPct = total > 0 ? (draws / total) * 100 : 0;
    const lossPct = total > 0 ? Math.max(0, 100 - winPct - drawPct) : 0;
    const ratings = profileStats?.ratings || {
      classical: (currentUser.elo ?? 1200) + 12,
      rapid: currentUser.elo ?? 1200,
      blitz: Math.max(400, (currentUser.elo ?? 1200) - 18),
    };
    const openings = profileStats?.topOpenings || [];
    const titleBadge = getTitleFromElo(currentUser.elo, currentUser.role);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-gradient-to-br from-[#0a1622] via-[#0d1c2a] to-[#08121c] border border-cyan-500/25 shadow-2xl overflow-hidden text-white max-h-[92vh] overflow-y-auto">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-sm">
                ♞
              </div>
              <span className="text-sm font-bold tracking-tight text-white">ChessCoach</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/60">
                {lang === 'en' ? 'PLAYER PROFILE' : 'HỒ SƠ KỲ THỦ'}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Player Identity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 via-blue-600/30 to-indigo-700/40 border border-cyan-400/40 flex items-center justify-center text-3xl font-black text-white shadow-lg">
                    {(currentUser.displayName || currentUser.username).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-2 inset-x-1 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold text-center shadow">
                    {titleBadge}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <span>🏳️</span>
                    <span>{currentUser.country || 'Việt Nam'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-2xl font-extrabold text-white tracking-tight truncate">
                      {currentUser.displayName}
                    </h3>
                    <button
                      onClick={() => {
                        setEditName(currentUser.displayName);
                        setEditCountry(currentUser.country || 'Việt Nam');
                        setEditingProfile((v) => !v);
                      }}
                      title={lang === 'en' ? 'Edit Profile' : 'Chỉnh sửa hồ sơ'}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-mono text-white/60 mt-0.5">
                    ID #{currentUser.id.slice(-8).toUpperCase()} · @{currentUser.username}
                  </div>
                </div>
              </div>

              {statsLoading && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />}
            </div>

            {editingProfile && (
              <form
                onSubmit={handleSaveProfile}
                className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={lang === 'en' ? 'Display name' : 'Tên hiển thị'}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
                <input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder={lang === 'en' ? 'Country' : 'Quốc gia'}
                  className="sm:w-40 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Save' : 'Lưu'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white/80 cursor-pointer"
                  >
                    {lang === 'en' ? 'Cancel' : 'Hủy'}
                  </button>
                </div>
              </form>
            )}

            {/* Middle Row: Ratings & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-[#10202f]/90 border border-white/10 p-4 grid grid-cols-3 divide-x divide-white/10 text-center">
                <div className="px-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    <Crown className="w-3 h-3 text-white/80" />
                    <span>{lang === 'en' ? 'CLASSICAL' : 'TIÊU CHUẨN'}</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">
                    {ratings.classical}
                  </div>
                </div>
                <div className="px-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'en' ? 'RAPID' : 'CỜ NHANH'}</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">
                    {ratings.rapid}
                  </div>
                </div>
                <div className="px-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>{lang === 'en' ? 'BLITZ' : 'CỜ CHỚP'}</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">
                    {ratings.blitz}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#10202f]/90 border border-white/10 p-4 grid grid-cols-3 divide-x divide-white/10 text-center">
                <div className="px-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {lang === 'en' ? 'WIN RATE' : 'TỶ LỆ THẮNG'}
                  </div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {rec?.winRate ?? 0}%
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {lang === 'en' ? 'GAMES' : 'SỐ VÁN'}
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">{total}</div>
                </div>
                <div className="px-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {lang === 'en' ? 'AVG OPPONENT' : 'ĐỐI THỦ TB'}
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">
                    {rec?.avgOpponent ?? 1200}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Record Bar & Most Played Openings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-[#10202f]/90 border border-white/10 p-4 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {lang === 'en' ? 'RECORD' : 'THÀNH TÍCH'}
                </div>

                {/* W / D / L Segmented Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                  {total > 0 ? (
                    <>
                      <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
                      <div className="h-full bg-slate-500" style={{ width: `${drawPct}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${lossPct}%` }} />
                    </>
                  ) : (
                    <div className="h-full w-full bg-slate-700" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <span className="text-emerald-400">{wins} W</span>
                  <span className="text-white/60">{draws} D</span>
                  <span className="text-rose-400">{losses} L</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/60 pt-1 border-t border-white/10">
                  <span>
                    {lang === 'en' ? 'White' : 'Trắng'} · {rec?.whiteGames ?? 0}{' '}
                    {lang === 'en' ? 'games' : 'ván'}{' '}
                    <strong className="text-white">{rec?.whiteWinRate ?? 0}%</strong>
                  </span>
                  <span>
                    {lang === 'en' ? 'Black' : 'Đen'} · {rec?.blackGames ?? 0}{' '}
                    {lang === 'en' ? 'games' : 'ván'}{' '}
                    <strong className="text-white">{rec?.blackWinRate ?? 0}%</strong>
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#10202f]/90 border border-white/10 p-4 space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {lang === 'en' ? 'MOST PLAYED OPENINGS' : 'KHAI CUỘC HAY CHƠI'}
                </div>

                {openings.length === 0 ? (
                  <p className="text-xs text-white/60 py-4 text-center">
                    {lang === 'en'
                      ? 'Play a few games to see your top openings!'
                      : 'Hãy chơi vài ván để thống kê khai cuộc hay chơi!'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {openings.map((op) => (
                      <div
                        key={op.eco + op.name}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-mono text-[10px] font-bold text-cyan-300 shrink-0">
                            {op.eco}
                          </span>
                          <span className="font-semibold text-white truncate">{op.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] shrink-0 font-mono">
                          <span className="text-white/60">
                            {op.games} {lang === 'en' ? 'games' : 'ván'}
                          </span>
                          <span className="font-bold text-white w-8 text-right">{op.winRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-white/60">
                <strong className="text-cyan-300">ChessCoach</strong> · Follow Chess Better
              </span>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Sign Out' : 'Đăng xuất'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {tab === 'login'
                  ? lang === 'en'
                    ? 'Sign In'
                    : 'Đăng nhập tài khoản'
                  : lang === 'en'
                    ? 'Create Account'
                    : 'Đăng ký tài khoản mới'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'en'
                  ? 'Sync match history & progress to MongoDB'
                  : 'Đồng bộ lịch sử đấu & bài tập theo tài khoản'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                resetMessages();
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                resetMessages();
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Sign Up' : 'Đăng ký'}</span>
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === 'en' ? 'Username or Email' : 'Tên đăng nhập hoặc Email'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="vd: ky_thu_01"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === 'en' ? 'Password' : 'Mật khẩu'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'en' ? 'Username *' : 'Tên đăng nhập *'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ky_thu_01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'en' ? 'Display Name' : 'Tên hiển thị'}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Văn Hiền"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'en' ? 'Password *' : 'Mật khẩu *'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'en' ? 'Confirm *' : 'Nhập lại *'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{lang === 'en' ? 'Create Account' : 'Tạo tài khoản'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
