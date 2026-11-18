import React, { useEffect, useState } from 'react';
import { X, Trophy, Flame, Loader2, Crown } from 'lucide-react';
import { dbApi, type AuthUser, type LeaderboardEntry } from '../services/dbApi';

interface LeaderboardModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  currentUser,
  onClose,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    dbApi
      .getLeaderboard()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Lỗi tải BXH'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Bảng Xếp Hạng Kỳ Thủ</h2>
              <p className="text-[11px] text-slate-400">
                Xếp hạng theo Điểm tích lũy, ELO và số trận thắng
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
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              Chưa có kỳ thủ nào trên bảng xếp hạng.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isMe = currentUser?.id === entry.id;
                const rankBadge =
                  entry.rank === 1
                    ? 'bg-amber-500/25 border-amber-400/60 text-amber-300'
                    : entry.rank === 2
                      ? 'bg-slate-300/20 border-slate-300/50 text-slate-200'
                      : entry.rank === 3
                        ? 'bg-orange-600/25 border-orange-500/50 text-orange-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition ${
                      isMe
                        ? 'bg-emerald-500/15 border-emerald-500/50'
                        : 'bg-slate-800/45 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${rankBadge}`}
                      >
                        {entry.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : `#${entry.rank}`}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {entry.displayName}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 text-[10px] font-semibold">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          @{entry.username} · {entry.wins} thắng / {entry.gamesPlayed} trận
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25 text-[11px] font-semibold text-orange-300">
                        <Flame className="w-3 h-3" />
                        <span>Max {entry.bestStreak}</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-400">{entry.points} đ</div>
                        <div className="text-[10px] text-slate-400">ELO {entry.elo}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
