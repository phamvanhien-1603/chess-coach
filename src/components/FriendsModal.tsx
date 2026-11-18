import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Check,
  UserMinus,
  Clock,
  Loader2,
  LogIn,
  Swords,
} from 'lucide-react';
import {
  dbApi,
  type AuthUser,
  type FriendsOverview,
  type UserSearchResult,
} from '../services/dbApi';

interface FriendsModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onFriendsUpdated?: (incomingCount: number) => void;
  onChallengeFriend?: (friendName: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  open,
  currentUser,
  onClose,
  onOpenAuth,
  onFriendsUpdated,
  onChallengeFriend,
}) => {
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [overview, setOverview] = useState<FriendsOverview>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dbApi.getFriends();
      setOverview(data);
      onFriendsUpdated?.(data.incoming.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách bạn bè');
    } finally {
      setLoading(false);
    }
  }, [currentUser, onFriendsUpdated]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!currentUser) return;
      setSearching(true);
      setError(null);
      try {
        const users = await dbApi.searchUsers(q);
        setSearchResults(users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tìm kiếm');
      } finally {
        setSearching(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (open && currentUser) {
      loadFriends();
      if (tab === 'search') {
        runSearch(searchQuery);
      }
    }
  }, [open, currentUser, tab, loadFriends, runSearch, searchQuery]);

  if (!open) return null;

  const handleSendRequest = async (targetUserId: string) => {
    setActionId(targetUserId);
    setError(null);
    try {
      await dbApi.sendFriendRequest(targetUserId);
      await Promise.all([loadFriends(), runSearch(searchQuery)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được lời mời');
    } finally {
      setActionId(null);
    }
  };

  const handleRespond = async (friendshipId: string, action: 'accept' | 'decline') => {
    setActionId(friendshipId);
    setError(null);
    try {
      await dbApi.respondFriendRequest(friendshipId, action);
      await loadFriends();
      if (tab === 'search') await runSearch(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không phản hồi được');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    setActionId(friendshipId);
    setError(null);
    try {
      await dbApi.removeFriend(friendshipId);
      await loadFriends();
      if (tab === 'search') await runSearch(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Bạn bè & Cộng đồng</h2>
              <p className="text-[11px] text-slate-400">
                Tìm kiếm kỳ thủ, gửi lời mời kết bạn và theo dõi ELO
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
        {!currentUser ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                Đăng nhập để sử dụng tính năng Bạn bè
              </p>
              <p className="text-xs text-slate-400">
                Bạn cần có tài khoản để tìm kiếm kỳ thủ khác, gửi và nhận lời mời kết bạn.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="px-5 pt-3">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setTab('friends')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    tab === 'friends' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bạn bè ({overview.friends.length})
                </button>
                <button
                  onClick={() => setTab('requests')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    tab === 'requests' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Lời mời</span>
                  {overview.incoming.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {overview.incoming.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTab('search')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1 ${
                    tab === 'search' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tìm bạn</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {tab === 'friends' && (
                <>
                  {loading ? (
                    <div className="py-8 flex justify-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : overview.friends.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-slate-400">Bạn chưa có người bạn nào.</p>
                      <button
                        onClick={() => setTab('search')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Tìm bạn ngay</span>
                      </button>
                    </div>
                  ) : (
                    overview.friends.map((item) => (
                      <div
                        key={item.friendshipId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {item.user.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100 truncate">
                              {item.user.displayName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              @{item.user.username} · ELO {item.user.elo}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onChallengeFriend && (
                            <button
                              onClick={() => {
                                onChallengeFriend(item.user.displayName);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition cursor-pointer"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Thách đấu</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(item.friendshipId)}
                            disabled={actionId === item.friendshipId}
                            title="Hủy kết bạn"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-[11px] text-slate-300 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Hủy bạn</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === 'requests' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Lời mời nhận được ({overview.incoming.length})
                    </h3>
                    {overview.incoming.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">Không có lời mời mới.</p>
                    ) : (
                      <div className="space-y-2">
                        {overview.incoming.map((item) => (
                          <div
                            key={item.friendshipId}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-sky-500/25 border border-sky-500/40 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0">
                                {item.user.displayName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-100 truncate">
                                  {item.user.displayName}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  @{item.user.username} · ELO {item.user.elo}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRespond(item.friendshipId, 'accept')}
                                disabled={actionId === item.friendshipId}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Chấp nhận</span>
                              </button>
                              <button
                                onClick={() => handleRespond(item.friendshipId, 'decline')}
                                disabled={actionId === item.friendshipId}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Lời mời đã gửi ({overview.outgoing.length})
                    </h3>
                    {overview.outgoing.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">Chưa gửi lời mời nào.</p>
                    ) : (
                      <div className="space-y-2">
                        {overview.outgoing.map((item) => (
                          <div
                            key={item.friendshipId}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate">
                                {item.user.displayName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                @{item.user.username} · Đang chờ xác nhận
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemove(item.friendshipId)}
                              disabled={actionId === item.friendshipId}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer disabled:opacity-50"
                            >
                              Hủy lời mời
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'search' && (
                <div className="space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runSearch(searchQuery);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên đăng nhập hoặc tên hiển thị..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searching}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      Tìm
                    </button>
                  </form>

                  {searching ? (
                    <div className="py-6 flex justify-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Không tìm thấy kỳ thủ nào phù hợp.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                              {u.displayName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100 truncate">
                                {u.displayName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                @{u.username} · ELO {u.elo}
                              </div>
                            </div>
                          </div>

                          {u.relation === 'friends' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
                              <Check className="w-3 h-3" />
                              Bạn bè
                            </span>
                          ) : u.relation === 'pending_sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                              <Clock className="w-3 h-3" />
                              Đã gửi
                            </span>
                          ) : u.relation === 'pending_received' && u.friendshipId ? (
                            <button
                              onClick={() => handleRespond(u.friendshipId!, 'accept')}
                              disabled={actionId === u.friendshipId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Chấp nhận
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(u.id)}
                              disabled={actionId === u.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Kết bạn
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
