import React, { useState } from 'react';
import {
  Lightbulb,
  Undo2,
  Sparkles,
  BookOpen,
  Puzzle,
  Cpu,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Upload,
} from 'lucide-react';
import type {
  AppMode,
  EngineLine,
  MoveRecord,
  OpeningLine,
  TacticalPuzzle,
} from '../types/chess';
import { formatEval, QUALITY_META } from '../utils/chessCoach';
import { EvalGraph } from './EvalGraph';
import { useI18n } from '../i18n/I18nContext';

interface CoachPanelProps {
  mode: AppMode;
  moves: MoveRecord[];
  viewPly: number | null;
  onSelectPly: (ply: number | null) => void;
  engineLines: EngineLine[];
  isAnalyzing: boolean;
  isAiThinking: boolean;
  coachHint: string | null;
  geminiResponse: string | null;
  geminiLoading: boolean;
  hasGeminiKey: boolean;
  onRequestHint: () => void;
  onAskGemini: (question?: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  // Openings
  openings: OpeningLine[];
  activeOpening: OpeningLine;
  openingStep: number;
  onSelectOpening: (opening: OpeningLine) => void;
  onResetOpening: () => void;
  // Puzzles
  puzzles: TacticalPuzzle[];
  activePuzzle: TacticalPuzzle;
  puzzleStatus: 'solving' | 'solved' | 'wrong';
  onSelectPuzzle: (puzzle: TacticalPuzzle) => void;
  onNextPuzzle: () => void;
  onShowPuzzleHint: () => void;
  // Analyze
  currentFen: string;
  onLoadFenOrPgn: (input: string) => boolean;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  mode,
  moves,
  viewPly,
  onSelectPly,
  engineLines,
  isAnalyzing,
  isAiThinking,
  coachHint,
  geminiResponse,
  geminiLoading,
  hasGeminiKey,
  onRequestHint,
  onAskGemini,
  onUndo,
  canUndo,
  openings,
  activeOpening,
  openingStep,
  onSelectOpening,
  onResetOpening,
  puzzles,
  activePuzzle,
  puzzleStatus,
  onSelectPuzzle,
  onNextPuzzle,
  onShowPuzzleHint,
  currentFen,
  onLoadFenOrPgn,
}) => {
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [copiedFen, setCopiedFen] = useState(false);
  const [panelTab, setPanelTab] = useState<'coach' | 'engine' | 'history'>('coach');
  const { t } = useI18n();

  const activePly = viewPly ?? moves.length;
  const displayedMove = activePly > 0 ? moves[activePly - 1] : null;
  const qualityMeta = displayedMove?.quality ? QUALITY_META[displayedMove.quality] : null;

  // Group moves into pairs for 2-column PGN table
  const movePairs: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen).catch(() => {});
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Compact Panel Tabs (like MoveSense mockup) */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <button
          type="button"
          onClick={() => setPanelTab('coach')}
          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            panelTab === 'coach' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('coachTitle')}
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('engine')}
          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            panelTab === 'engine' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Stockfish
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('history')}
          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            panelTab === 'history' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('moveHistoryTitle')} ({moves.length})
        </button>
      </div>

      {/* Mode-Specific Header Card */}
      {mode === 'openings' && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-700">
              <BookOpen className="w-3.5 h-3.5" />
              Luyện Khai Cuộc
            </span>
            <span className="text-xs font-mono text-slate-500">
              Bước {Math.min(openingStep, activeOpening.moves.length)}/{activeOpening.moves.length}
            </span>
          </div>

          <select
            value={activeOpening.id}
            onChange={(e) => {
              const found = openings.find((o) => o.id === e.target.value);
              if (found) onSelectOpening(found);
            }}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-500"
          >
            {openings.map((op) => (
              <option key={op.id} value={op.id}>
                [{op.eco}] {op.viName} ({op.difficulty})
              </option>
            ))}
          </select>

          <p className="text-xs text-slate-600 leading-relaxed">{activeOpening.description}</p>

          <div className="flex flex-wrap gap-1.5">
            {activeOpening.keyIdeas.map((idea, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-1 rounded-lg bg-slate-800/80 text-slate-600 border border-slate-700/60"
              >
                • {idea}
              </span>
            ))}
          </div>

          {openingStep >= activeOpening.moves.length && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 text-xs">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Hoàn thành bài khai cuộc!
              </span>
              <button
                onClick={onResetOpening}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                Luyện lại
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'puzzles' && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <Puzzle className="w-3.5 h-3.5" />
              Giải Thế Cờ Chiến Thuật
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
              Elo {activePuzzle.rating}
            </span>
          </div>

          <select
            value={activePuzzle.id}
            onChange={(e) => {
              const found = puzzles.find((p) => p.id === e.target.value);
              if (found) onSelectPuzzle(found);
            }}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
          >
            {puzzles.map((pz, idx) => (
              <option key={pz.id} value={pz.id}>
                Bài {idx + 1}: {pz.title} ({pz.theme})
              </option>
            ))}
          </select>

          {puzzleStatus === 'solved' ? (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Chính xác! Bạn đã giải xong.
                </span>
                <button
                  onClick={onNextPuzzle}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Bài tiếp <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{activePuzzle.explanation}</p>
            </div>
          ) : puzzleStatus === 'wrong' ? (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between text-xs text-rose-200">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Chưa phải nước mạnh nhất. Hãy thử lại!
              </span>
              <button
                onClick={onShowPuzzleHint}
                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 font-semibold cursor-pointer"
              >
                Xem gợi ý
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Chủ đề: <strong className="text-slate-700">{activePuzzle.theme}</strong></span>
              <button
                onClick={onShowPuzzleHint}
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-200 font-medium cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Gợi ý
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'analyze' && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Nạp thế cờ (FEN / PGN)
            </span>
            <button
              onClick={handleCopyFen}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedFen ? 'Đã chép FEN!' : 'Chép FEN'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={fenInput}
              onChange={(e) => {
                setFenInput(e.target.value);
                setFenError(false);
              }}
              placeholder="Dán chuỗi FEN hoặc PGN vào đây..."
              className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => {
                const ok = onLoadFenOrPgn(fenInput);
                if (!ok) setFenError(true);
                else setFenInput('');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Nạp
            </button>
          </div>
          {fenError && <p className="text-xs text-rose-400">Chuỗi FEN hoặc PGN không hợp lệ.</p>}
        </div>
      )}

      {/* AI Coach Feedback Card */}
      {panelTab === 'coach' && (
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-3">
        {/* Friendly Greeting Header */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/75 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center text-xl shadow-2xs shrink-0">
              🤖
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                {t('coachGreeting')}
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                {isAiThinking
                  ? t('aiThinking')
                  : isAnalyzing
                    ? t('analyzing')
                    : t('coachGreetingSub')}
              </p>
            </div>
          </div>

          {qualityMeta && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${qualityMeta.badgeBg}`}>
              {qualityMeta.label}
            </span>
          )}
        </div>

        {/* Best Move Card (with Blue Pill Badge) */}
        {engineLines[0]?.pvSan[0] && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{t('coachBestHintTitle')}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('engineDepth')} {engineLines[0].depth} · Stockfish 19
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-100/90 border border-blue-200 text-center shrink-0">
              <div className="font-mono text-sm font-extrabold text-blue-800 leading-none">
                {engineLines[0].pvSan[0]}
              </div>
              <div className="text-[9px] font-bold text-blue-600 mt-0.5">{t('coachBestHintLabel')}</div>
            </div>
          </div>
        )}

        {/* Soft Mint Green Explanation Card */}
        <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/90 p-3 text-xs sm:text-[13px] text-slate-700 leading-relaxed min-h-[56px]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('coachExplainTitle')}</span>
          </div>
          {coachHint ? (
            <p className="text-emerald-900 font-medium">{coachHint}</p>
          ) : displayedMove?.explanation ? (
            <p className="text-emerald-950">
              <span className="font-mono font-bold text-slate-900 mr-1.5">
                {displayedMove.moveNumber}
                {displayedMove.color === 'w' ? '.' : '...'} {displayedMove.san}:
              </span>
              {displayedMove.explanation}
            </p>
          ) : (
            <p className="text-emerald-800/80">
              {t('coachDefaultHint')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRequestHint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 text-xs font-semibold transition cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {t('btnBestHint')}
          </button>

          {canUndo && (
            <button
              onClick={onUndo}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              {t('btnUndo')}
            </button>
          )}

          {hasGeminiKey && (
            <button
              onClick={() => onAskGemini()}
              disabled={geminiLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {geminiLoading ? t('btnAsking') : t('btnAskGemini')}
            </button>
          )}
        </div>

        {/* Optional Gemini Deep Commentary */}
        {hasGeminiKey && (
          <div className="space-y-2 pt-1 border-t border-slate-800/70">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customQuestion.trim()) return;
                onAskGemini(customQuestion);
                setCustomQuestion('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Hỏi Gemini về thế cờ này..."
                className="flex-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={geminiLoading}
                className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Gửi
              </button>
            </form>
            {geminiResponse && (
              <div className="rounded-xl bg-violet-950/30 border border-violet-500/30 p-2.5 text-xs text-violet-100 leading-relaxed">
                {geminiResponse}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Top 3 Stockfish Engine Lines */}
      {panelTab === 'engine' && (
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            {t('engineLinesTitle')}
          </span>
          {engineLines[0] && (
            <span className="text-[11px] font-mono text-slate-500">{t('engineDepth')} {engineLines[0].depth}</span>
          )}
        </div>

        <div className="space-y-1.5">
          {engineLines.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">{t('engineComputing')}</p>
          ) : (
            engineLines.slice(0, 3).map((line, idx) => {
              const evalStr = formatEval(line.scoreCp, line.mate);
              const isPositive = (line.mate !== null && line.mate > 0) || (line.mate === null && (line.scoreCp ?? 0) >= 0);
              return (
                <div
                  key={line.multipv}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <span
                    className={`font-mono font-bold w-11 text-center py-0.5 rounded ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {evalStr}
                  </span>
                  <span className={`font-mono truncate ${idx === 0 ? 'text-emerald-700 font-semibold' : 'text-slate-600'}`}>
                    {line.pvSan.slice(0, 5).join(' ')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* Evaluation Advantage Graph */}
      <EvalGraph moves={moves} activePly={activePly} onSelectPly={(ply) => onSelectPly(ply)} />

      {/* Interactive Move History */}
      {(panelTab === 'history' || panelTab === 'coach') && (
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 flex-1 flex flex-col min-h-[160px] max-h-[260px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('moveHistoryTitle')} ({moves.length} {t('movesCountUnit')})
          </span>
          {viewPly !== null && (
            <button
              onClick={() => onSelectPly(null)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              {t('backToCurrent')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[210px] pr-1 space-y-0.5 font-mono text-xs">
          {movePairs.length === 0 ? (
            <p className="text-slate-500 font-sans py-3 text-center">Chưa có nước đi nào.</p>
          ) : (
            movePairs.map((pair) => (
              <div key={pair.num} className="grid grid-cols-[36px_1fr_1fr] items-center gap-1 py-0.5">
                <span className="text-slate-500 text-right pr-1.5">{pair.num}.</span>
                {pair.white && (
                  <button
                    onClick={() => onSelectPly(pair.white!.ply)}
                    className={`flex items-center justify-between px-2 py-1 rounded-md text-left transition cursor-pointer ${
                      activePly === pair.white.ply
                        ? 'bg-emerald-500/25 text-emerald-800 font-bold'
                        : 'hover:bg-slate-800 text-slate-700'
                    }`}
                  >
                    <span>{pair.white.san}</span>
                    {pair.white.quality && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: QUALITY_META[pair.white.quality].dotColor }}
                        title={QUALITY_META[pair.white.quality].label}
                      />
                    )}
                  </button>
                )}
                {pair.black ? (
                  <button
                    onClick={() => onSelectPly(pair.black!.ply)}
                    className={`flex items-center justify-between px-2 py-1 rounded-md text-left transition cursor-pointer ${
                      activePly === pair.black.ply
                        ? 'bg-emerald-500/25 text-emerald-800 font-bold'
                        : 'hover:bg-slate-800 text-slate-700'
                    }`}
                  >
                    <span>{pair.black.san}</span>
                    {pair.black.quality && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: QUALITY_META[pair.black.quality].dotColor }}
                        title={QUALITY_META[pair.black.quality].label}
                      />
                    )}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
};
