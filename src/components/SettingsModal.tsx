import React, { useState } from 'react';
import { X, Key, Volume2, VolumeX, Sparkles, Eye, Database, Sun, Moon } from 'lucide-react';
import type { BoardTheme, PlayerColor, SkillLevelOption } from '../types/chess';
import { SKILL_LEVELS } from '../utils/chessCoach';
import { useI18n } from '../i18n/I18nContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  skillLevel: SkillLevelOption;
  onChangeSkillLevel: (level: SkillLevelOption) => void;
  playerColor: PlayerColor;
  onChangePlayerColor: (color: PlayerColor) => void;
  boardTheme: BoardTheme;
  onChangeBoardTheme: (theme: BoardTheme) => void;
  appearance: 'light' | 'dark';
  onChangeAppearance: (mode: 'light' | 'dark') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoShowArrows: boolean;
  onToggleAutoArrows: () => void;
  geminiApiKey: string;
  onChangeGeminiApiKey: (key: string) => void;
  dbConnected: boolean;
  dbName: string | null;
  onConnectMongo: (uri: string) => Promise<{ ok: boolean; error?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  skillLevel,
  onChangeSkillLevel,
  playerColor,
  onChangePlayerColor,
  boardTheme,
  onChangeBoardTheme,
  appearance,
  onChangeAppearance,
  soundEnabled,
  onToggleSound,
  autoShowArrows,
  onToggleAutoArrows,
  geminiApiKey,
  onChangeGeminiApiKey,
  dbConnected,
  dbName,
  onConnectMongo,
}) => {
  const [mongoUriInput, setMongoUriInput] = useState('mongodb://127.0.0.1:27017/chess_coach');
  const [mongoConnecting, setMongoConnecting] = useState(false);
  const [mongoMsg, setMongoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100">{t('settingsTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* App Appearance: Light / Dark */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t('appearanceLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeAppearance('light')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  appearance === 'light'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>{t('lightModeBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeAppearance('dark')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  appearance === 'dark'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-300" />
                <span>{t('darkModeBtn')}</span>
              </button>
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Trình độ AI đối thủ (Stockfish 19)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SKILL_LEVELS.map((lvl) => {
                const active = lvl.id === skillLevel.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => onChangeSkillLevel(lvl)}
                    className={`text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-100'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{lvl.label}</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-950/60 text-emerald-400">
                        ~{lvl.elo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{lvl.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Color */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Quân của bạn (khi chơi với AI)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangePlayerColor('w')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                  playerColor === 'w'
                    ? 'bg-slate-100 text-slate-950 border-slate-100'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ♔ Quân Trắng (Đi trước)
              </button>
              <button
                onClick={() => onChangePlayerColor('b')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                  playerColor === 'b'
                    ? 'bg-slate-950 text-slate-100 border-emerald-500'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ♚ Quân Đen (Đi sau)
              </button>
            </div>
          </div>

          {/* Board Theme */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Giao diện bàn cờ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'emerald', label: 'Xanh giải đấu', c1: '#ebecd0', c2: '#739552' },
                  { id: 'wood', label: 'Gỗ cổ điển', c1: '#f0d9b5', c2: '#b58863' },
                  { id: 'slate', label: 'Đá xám hiện đại', c1: '#cbd5e1', c2: '#475569' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeBoardTheme(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    boardTheme === t.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="flex w-5 h-5 rounded overflow-hidden shrink-0 border border-slate-950/30">
                    <span className="w-1/2 h-full" style={{ backgroundColor: t.c1 }} />
                    <span className="w-1/2 h-full" style={{ backgroundColor: t.c2 }} />
                  </span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5">
            <button
              onClick={onToggleSound}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                Âm thanh bàn cờ
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  soundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {soundEnabled ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            <button
              onClick={onToggleAutoArrows}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                <Eye className="w-4 h-4 text-sky-400" />
                Tự động hiện mũi tên nước tốt nhất
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  autoShowArrows ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {autoShowArrows ? 'BẬT' : 'TẮT'}
              </span>
            </button>
          </div>

          {/* MongoDB Connection */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Database className="w-3.5 h-3.5" />
                Kết nối MongoDB
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  dbConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {dbConnected ? `Đã kết nối (${dbName})` : 'Chưa kết nối'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dán chuỗi kết nối MongoDB của bạn (local hoặc MongoDB Atlas <code className="text-slate-300">mongodb+srv://...</code>) để lưu lịch sử ván đấu và tiến độ luyện tập.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={mongoUriInput}
                onChange={(e) => setMongoUriInput(e.target.value)}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/chess_coach"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={async () => {
                  setMongoConnecting(true);
                  setMongoMsg(null);
                  const res = await onConnectMongo(mongoUriInput);
                  setMongoConnecting(false);
                  if (res.ok) {
                    setMongoMsg({ ok: true, text: 'Kết nối MongoDB thành công!' });
                  } else {
                    setMongoMsg({ ok: false, text: res.error || 'Không thể kết nối MongoDB.' });
                  }
                }}
                disabled={mongoConnecting}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {mongoConnecting ? 'Đang nối...' : 'Kết nối'}
              </button>
            </div>
            {mongoMsg && (
              <p className={`text-xs ${mongoMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{mongoMsg.text}</p>
            )}
          </div>

          {/* Optional Gemini API Key */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Liên kết Gemini AI (Tùy chọn)
            </label>
            <p className="text-xs text-slate-400 mb-2.5">
              Nhập Gemini API Key để Huấn luyện viên AI giải thích chiến lược chuyên sâu bằng ngôn ngữ tự nhiên (chỉ lưu cục bộ trên trình duyệt của bạn).
            </p>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => onChangeGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
