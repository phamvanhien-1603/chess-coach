import React from 'react';
import { X, Database, Trash2, Play, Trophy, AlertCircle, BookOpen, Puzzle } from 'lucide-react';
import type { SavedGameSummary, UserProgress } from '../services/dbApi';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  dbConnected: boolean;
  dbName: string | null;
  games: SavedGameSummary[];
  progress: UserProgress | null;
  loading: boolean;
  onLoadGame: (id: string) => void;
  onDeleteGame: (id: string) => void;
  onOpenSettings: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  open,
  onClose,
  dbConnected,
  dbName,
  games,
  progress,
  loading,
  onLoadGame,
  onDeleteGame,
  onOpenSettings,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className={`w-5 h-5 ${dbConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <h2 className="text-lg font-bold text-slate-100 leading-none">Lịch sử &amp; Tiến độ (MongoDB)</h2>
              <p className="text-xs text-slate-400 mt-1">
                {dbConnected ? `Đang kết nối: ${dbName}` : 'Chưa kết nối MongoDB'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {!dbConnected ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Chưa kết nối được với MongoDB</p>
                  <p className="text-xs text-rose-200/80 mt-1">
                    Hãy mở phần Cài đặt để nhập chuỗi kết nối MongoDB của bạn (MongoDB local hoặc MongoDB Atlas).
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Cấu hình MongoDB ngay
              </button>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              {progress && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Ván đã đấu
                    </div>
                    <p className="text-lg font-bold text-slate-100 mt-1">
                      {progress.stats.wins}/{progress.stats.totalGames}{' '}
                      <span className="text-xs font-normal text-slate-400">thắng</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-xs text-slate-400">Sai số TB (CPL)</div>
                    <p className="text-lg font-bold text-sky-400 mt-1">{progress.stats.avgCpLoss}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                      Khai cuộc
                    </div>
                    <p className="text-lg font-bold text-violet-300 mt-1">
                      {progress.completedOpenings.length} bài
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Puzzle className="w-3.5 h-3.5 text-emerald-400" />
                      Thế cờ đã giải
                    </div>
                    <p className="text-lg font-bold text-emerald-300 mt-1">
                      {progress.solvedPuzzles.length} bài
                    </p>
                  </div>
                </div>
              )}

              {/* Saved Games List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Các ván đấu đã lưu ({games.length})
                </h3>

                {loading ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Đang tải từ MongoDB...</p>
                ) : games.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center rounded-xl bg-slate-950/50 border border-slate-800/70">
                    Chưa có ván đấu nào được lưu. Khi chơi xong hoặc bấm &quot;Lưu ván&quot;, dữ liệu sẽ lưu vào MongoDB.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {games.map((g) => (
                      <div
                        key={g._id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100 truncate">{g.title}</span>
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {g.playerColor === 'w' ? 'Trắng' : 'Đen'} vs ~{g.aiElo}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span className="text-emerald-400 font-medium">{g.result}</span>
                            <span>•</span>
                            <span>Blunder: {g.blunders}</span>
                            <span>•</span>
                            <span>CPL TB: {g.avgCpLoss}</span>
                            <span>•</span>
                            <span>{new Date(g.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onLoadGame(g._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Xem lại
                          </button>
                          <button
                            onClick={() => onDeleteGame(g._id)}
                            title="Xóa ván đấu"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
