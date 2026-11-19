import React, { useCallback, useEffect, useState } from 'react';
import { X, Target, Coins, Check, Loader2, LogIn } from 'lucide-react';
import { dbApi, type AuthUser, type DailyQuestItem } from '../services/dbApi';
import { useI18n } from '../i18n/I18nContext';

interface QuestsModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onUserUpdated: (user: AuthUser) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  open,
  currentUser,
  onClose,
  onOpenAuth,
  onUserUpdated,
}) => {
  const [quests, setQuests] = useState<DailyQuestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const loadQuests = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dbApi.getQuests();
      setQuests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (open && currentUser) {
      loadQuests();
    }
  }, [open, currentUser, loadQuests]);

  if (!open) return null;

  const handleClaim = async (questId: string) => {
    setClaimingId(questId);
    setError(null);
    try {
      const updatedUser = await dbApi.claimQuest(questId);
      onUserUpdated(updatedUser);
      await loadQuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không nhận được thưởng');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('questsTitle')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('questsSub')}
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

        <div className="p-5 space-y-3">
          {!currentUser ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-300">Đăng nhập để nhận và theo dõi nhiệm vụ hằng ngày.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-8 flex justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                quests.map((q) => {
                  const done = q.progress >= q.target;
                  const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-100">{q.title}</div>
                          <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                            <Coins className="w-3 h-3" />
                            <span>
                              +{q.rewardCoins} Xu · +{q.rewardPoints} Điểm
                            </span>
                          </div>
                        </div>

                        {q.claimed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                            <Check className="w-3 h-3" />
                            Đã nhận
                          </span>
                        ) : done ? (
                          <button
                            onClick={() => handleClaim(q.id)}
                            disabled={claimingId === q.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            {claimingId === q.id ? 'Đang nhận...' : 'Nhận thưởng'}
                          </button>
                        ) : (
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {q.progress}/{q.target}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
