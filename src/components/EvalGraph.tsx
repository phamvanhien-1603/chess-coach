import React from 'react';
import type { MoveRecord } from '../types/chess';
import { useI18n } from '../i18n/I18nContext';

interface EvalGraphProps {
  moves: MoveRecord[];
  activePly: number;
  onSelectPly: (ply: number) => void;
}

function clampEvalCp(cp?: number | null, mate?: number | null): number {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? 600 : -600;
  }
  if (cp === null || cp === undefined) return 0;
  return Math.max(-600, Math.min(600, cp));
}

export const EvalGraph: React.FC<EvalGraphProps> = ({ moves, activePly, onSelectPly }) => {
  const { t } = useI18n();
  if (moves.length === 0) {
    return (
      <div className="h-20 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-[11px] text-slate-400">
        {t('evalGraphEmpty')}
      </div>
    );
  }

  const width = 320;
  const height = 76;
  const midY = height / 2;

  const points = moves.map((m, idx) => {
    const val = clampEvalCp(m.evalAfterCp, m.evalAfterMate);
    const x = moves.length === 1 ? width / 2 : (idx / (moves.length - 1)) * width;
    const y = midY - (val / 600) * (midY - 6);
    return { x, y, ply: m.ply, quality: m.quality };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${midY} L ${points[0].x.toFixed(1)} ${midY} Z`;

  const activePoint = points.find((p) => p.ply === activePly) || points[points.length - 1];

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-3">
      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mb-1 px-1">
        <span>{t('evalGraphTitle')}</span>
        <span>{t('evalGraphLegend')}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-16 overflow-visible cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const idx = Math.round(ratio * (moves.length - 1));
          if (moves[idx]) onSelectPly(moves[idx].ply);
        }}
      >
        {/* Center zero line */}
        <line x1={0} y1={midY} x2={width} y2={midY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

        {/* Area fill */}
        <path d={areaPath} fill="rgba(37, 99, 235, 0.14)" />

        {/* Main curve */}
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />

        {/* Blunder / Mistake markers */}
        {points.map((p) =>
          p.quality === 'blunder' || p.quality === 'mistake' ? (
            <circle
              key={p.ply}
              cx={p.x}
              cy={p.y}
              r={2.8}
              fill={p.quality === 'blunder' ? '#f43f5e' : '#f59e0b'}
            />
          ) : null
        )}

        {/* Active ply indicator */}
        {activePoint && (
          <>
            <line
              x1={activePoint.x}
              y1={0}
              x2={activePoint.x}
              y2={height}
              stroke="#38bdf8"
              strokeWidth="1"
              opacity="0.7"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r={3.5} fill="#38bdf8" stroke="#0f172a" strokeWidth="1.2" />
          </>
        )}
      </svg>
    </div>
  );
};
