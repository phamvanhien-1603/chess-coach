import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Shield,
  Users,
  Gamepad2,
  Database,
  Trash2,
  Sparkles,
  Plus,
  Loader2,
  Search,
} from 'lucide-react';
import { dbApi, type AdminOverview, type AuthUser } from '../services/dbApi';

interface AdminModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onCurrentUserUpdated: (user: AuthUser) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  currentUser,
  onClose,
  onCurrentUserUpdated,
}) => {
  const [tab, setTab] = useState<'users' | 'games'>('users');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dbApi.adminGetOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && currentUser?.role === 'admin') {
      loadOverview();
    }
  }, [open, currentUser, loadOverview]);

  if (!open || currentUser?.role !== 'admin') return null;

  const handlePatchUser = async (
    userId: string,
    patch: Parameters<typeof dbApi.adminUpdateUser>[1]
  ) => {
    setBusyId(userId);
    setError(null);
    try {
      const updated = await dbApi.adminUpdateUser(userId, patch);
      if (updated.id === currentUser.id) {
        onCurrentUserUpdated(updated);
      }
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Xóa tài khoản "${username}" và toàn bộ dữ liệu liên quan?`)) return;
    setBusyId(userId);
    setError(null);
    try {
      await dbApi.adminDeleteUser(userId);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được tài khoản');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    setBusyId(gameId);
    setError(null);
    try {
      await dbApi.adminDeleteGame(gameId);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được ván đấu');
    } finally {
      setBusyId(null);
    }
  };

  const filteredUsers = (data?.users || []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-rose-500/10 to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Bảng Điều Khiển Quản Lý (Full Quyền)</h2>
              <p className="text-[11px] text-slate-400">
                Quản lý toàn bộ tài khoản, Xu, Điểm, ELO, Skin, Phân quyền & Ván đấu
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

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 pt-4">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Người dùng
              </div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">{data.stats.totalUsers}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                Ván đấu đã lưu
              </div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">{data.stats.totalGames}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400">Kết nối bạn bè</div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">
                {data.stats.totalFriendships}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Database
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1 truncate">
                {data.stats.dbName}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-5 pt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'users' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Người dùng ({data?.users.length ?? 0})
            </button>
            <button
              onClick={() => setTab('games')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'games' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ván đấu ({data?.recentGames.length ?? 0})
            </button>
          </div>

          {tab === 'users' && (
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Lọc theo tên / email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          {loading && !data ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : tab === 'users' ? (
            filteredUsers.map((u) => {
              const busy = busyId === u.id;
              const isSelf = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {u.displayName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      @{u.username} · {u.email}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Xu: <strong className="text-amber-300">{u.coins}</strong></span>
                      <span>Điểm: <strong className="text-emerald-300">{u.points}</strong></span>
                      <span>ELO: <strong className="text-sky-300">{u.elo}</strong></span>
                      <span>Chuỗi: <strong className="text-orange-300">{u.winStreak}</strong></span>
                      <span>Skin: <strong>{u.ownedSkins?.length ?? 2}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePatchUser(u.id, { coins: (u.coins || 0) + 500 })}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold text-amber-300 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      500 Xu
                    </button>
                    <button
                      onClick={() => handlePatchUser(u.id, { points: (u.points || 0) + 500 })}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      500 Điểm
                    </button>
                    <button
                      onClick={() => handlePatchUser(u.id, { grantAllSkins: true })}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-[11px] font-semibold text-purple-300 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      Full Skin
                    </button>
                    {!isSelf && (
                      <>
                        <button
                          onClick={() =>
                            handlePatchUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })
                          }
                          disabled={busy}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] font-semibold text-slate-200 cursor-pointer disabled:opacity-50"
                        >
                          {u.role === 'admin' ? 'Hạ User' : 'Lên Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={busy}
                          title="Xóa tài khoản"
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            (data?.recentGames || []).map((g) => (
              <div
                key={g._id}
                className="p-3 rounded-xl bg-slate-800/45 border border-slate-700/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {g.title} · <span className="text-emerald-400">{g.result}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Người chơi: {g.ownerName} · AI ELO {g.aiElo} ·{' '}
                    {new Date(g.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGame(g._id)}
                  disabled={busyId === g._id}
                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
