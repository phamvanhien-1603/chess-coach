import React from 'react';
import { formatEval } from '../utils/chessCoach';

interface EvalBarProps {
  scoreCp: number | null;
  mate: number | null;
  flipped: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ scoreCp, mate, flipped }) => {
  let whitePercent = 50;

  if (mate !== null && mate !== undefined) {
    whitePercent = mate > 0 ? 100 : 0;
  } else if (scoreCp !== null && scoreCp !== undefined) {
    const sigmoid = 2 / (1 + Math.exp(-0.0038 * scoreCp)) - 1;
    whitePercent = Math.max(4, Math.min(96, 50 + 50 * sigmoid));
  }

  const label = formatEval(scoreCp, mate);
  const whiteAdvantage = (mate !== null && mate > 0) || (mate === null && (scoreCp ?? 0) >= 0);

  return (
    <div
      className="relative flex flex-col w-7 sm:w-8 h-full rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner select-none shrink-0"
      title={`Đánh giá thế cờ: ${label}`}
    >
      {/* Top / Bottom fill depending on board orientation */}
      {!flipped ? (
        <>
          <div
            className="w-full bg-slate-800 transition-all duration-500 ease-out"
            style={{ height: `${100 - whitePercent}%` }}
          />
          <div
            className="w-full bg-slate-100 transition-all duration-500 ease-out"
            style={{ height: `${whitePercent}%` }}
          />
        </>
      ) : (
        <>
          <div
            className="w-full bg-slate-100 transition-all duration-500 ease-out"
            style={{ height: `${whitePercent}%` }}
          />
          <div
            className="w-full bg-slate-800 transition-all duration-500 ease-out"
            style={{ height: `${100 - whitePercent}%` }}
          />
        </>
      )}

      {/* Score text */}
      <span
        className={`absolute left-0 right-0 text-center text-[10px] font-bold tracking-tight px-0.5 ${
          whiteAdvantage
            ? flipped
              ? 'top-1.5 text-slate-900'
              : 'bottom-1.5 text-slate-900'
            : flipped
              ? 'bottom-1.5 text-slate-100'
              : 'top-1.5 text-slate-100'
        }`}
      >
        {label}
      </span>
    </div>
  );
};
