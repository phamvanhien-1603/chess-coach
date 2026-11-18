import React, { useState } from 'react';
import { X, ShoppingBag, Coins, Check, Sparkles, LogIn, Loader2 } from 'lucide-react';
import { BOARD_SKINS, EFFECT_SKINS, PIECE_SKINS } from '../data/skins';
import { dbApi, type AuthUser } from '../services/dbApi';

interface ShopModalProps {
  open: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onUserUpdated: (user: AuthUser) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  open,
  currentUser,
  onClose,
  onOpenAuth,
  onUserUpdated,
}) => {
  const [tab, setTab] = useState<'piece' | 'board' | 'effect'>('piece');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const owned = new Set(currentUser?.ownedSkins || ['piece:classic', 'board:default']);
  const coins = currentUser?.coins ?? 0;

  const handleBuy = async (skinId: string) => {
    setBusyId(skinId);
    setError(null);
    try {
      const updated = await dbApi.buySkin(skinId);
      onUserUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mua skin thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (category: 'piece' | 'board' | 'effect', skinKey: string) => {
    const id = `${category}:${skinKey}`;
    setBusyId(id);
    setError(null);
    try {
      const updated = await dbApi.equipSkin(category, skinKey);
      onUserUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trang bị thất bại');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Cửa Hàng Skin 3D & Bàn Cờ</h2>
              <p className="text-[11px] text-slate-400">
                Dùng Xu kiếm được sau mỗi ván đấu để mở khóa & trang bị skin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs font-bold text-amber-300">
                <Coins className="w-3.5 h-3.5" />
                <span>{coins} Xu</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!currentUser ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                Đăng nhập để tích Xu và mua Skin
              </p>
              <p className="text-xs text-slate-400">
                Mỗi trận đấu hoàn thành sẽ cộng Xu và Điểm thưởng trực tiếp vào tài khoản của bạn.
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
                  onClick={() => setTab('piece')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    tab === 'piece' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quân Cờ 3D ({PIECE_SKINS.length})
                </button>
                <button
                  onClick={() => setTab('board')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    tab === 'board' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bàn Cờ ({BOARD_SKINS.length})
                </button>
                <button
                  onClick={() => setTab('effect')}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    tab === 'effect' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hiệu ứng Hạ cờ ({EFFECT_SKINS.length})
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tab === 'piece'
                ? PIECE_SKINS.map((skin) => {
                    const isOwned = skin.price === 0 || owned.has(skin.id);
                    const isEquipped = (currentUser.equippedPieceSkin || 'classic') === skin.key;
                    const busy = busyId === skin.id;

                    return (
                      <div
                        key={skin.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                          isEquipped
                            ? 'bg-purple-500/10 border-purple-500/60'
                            : 'bg-slate-800/45 border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center -space-x-2 shrink-0 pt-0.5">
                            <span
                              className="w-7 h-7 rounded-full border-2 border-slate-900 shadow"
                              style={{ backgroundColor: skin.previewWhite }}
                            />
                            <span
                              className="w-7 h-7 rounded-full border-2 border-slate-900 shadow"
                              style={{ backgroundColor: skin.previewBlack }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100">{skin.name}</div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{skin.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-xs font-bold text-amber-300">
                            {skin.price === 0 ? 'Miễn phí' : `${skin.price} Xu`}
                          </span>

                          {isEquipped ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                              <Check className="w-3 h-3" />
                              Đang dùng
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquip('piece', skin.key)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Trang bị'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy(skin.id)}
                              disabled={busy || coins < skin.price}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mua ngay'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                : tab === 'board'
                  ? BOARD_SKINS.map((skin) => {
                    const isOwned = skin.price === 0 || owned.has(skin.id);
                    const isEquipped = (currentUser.equippedBoardSkin || 'default') === skin.key;
                    const busy = busyId === skin.id;

                    return (
                      <div
                        key={skin.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                          isEquipped
                            ? 'bg-purple-500/10 border-purple-500/60'
                            : 'bg-slate-800/45 border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg border-2 grid grid-cols-2 overflow-hidden shrink-0"
                            style={{ borderColor: skin.frameHex }}
                          >
                            <span style={{ backgroundColor: skin.lightHex }} />
                            <span style={{ backgroundColor: skin.darkHex }} />
                            <span style={{ backgroundColor: skin.darkHex }} />
                            <span style={{ backgroundColor: skin.lightHex }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100">{skin.name}</div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{skin.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-xs font-bold text-amber-300">
                            {skin.price === 0 ? 'Miễn phí' : `${skin.price} Xu`}
                          </span>

                          {isEquipped ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                              <Check className="w-3 h-3" />
                              Đang dùng
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquip('board', skin.key)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Trang bị'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy(skin.id)}
                              disabled={busy || coins < skin.price}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mua ngay'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                  : EFFECT_SKINS.map((skin) => {
                      const isOwned = skin.price === 0 || owned.has(skin.id);
                      const isEquipped = (currentUser.equippedEffectSkin || 'none') === skin.key;
                      const busy = busyId === skin.id;

                      return (
                        <div
                          key={skin.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                            isEquipped
                              ? 'bg-purple-500/10 border-purple-500/60'
                              : 'bg-slate-800/45 border-slate-700/70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow"
                              style={{
                                background: `linear-gradient(135deg, ${skin.primaryHex}, ${skin.secondaryHex})`,
                              }}
                            >
                              <Sparkles className="w-5 h-5 text-white drop-shadow" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100">{skin.name}</div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{skin.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-xs font-bold text-amber-300">
                              {skin.price === 0 ? 'Miễn phí' : `${skin.price} Xu`}
                            </span>

                            {isEquipped ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                                <Check className="w-3 h-3" />
                                Đang dùng
                              </span>
                            ) : isOwned ? (
                              <button
                                onClick={() => handleEquip('effect', skin.key)}
                                disabled={busy}
                                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Trang bị'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBuy(skin.id)}
                                disabled={busy || coins < skin.price}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mua ngay'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
