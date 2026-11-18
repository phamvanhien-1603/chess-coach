import React, { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { ArrowOverlay, BoardTheme, PlayerColor } from '../types/chess';
import { getBoardSkin } from '../data/skins';
import { ChessPiece } from './ChessPieces';

interface ChessBoardProps {
  fen: string;
  flipped: boolean;
  theme: BoardTheme;
  boardSkin?: string;
  interactive: boolean;
  allowedColor?: PlayerColor | 'both';
  lastMove?: { from: string; to: string } | null;
  arrows?: ArrowOverlay[];
  onMove: (from: string, to: string, promotion?: string) => boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const THEME_COLORS: Record<BoardTheme, { light: string; dark: string; coordLight: string; coordDark: string }> = {
  emerald: {
    light: '#ebecd0',
    dark: '#739552',
    coordLight: '#739552',
    coordDark: '#ebecd0',
  },
  wood: {
    light: '#f0d9b5',
    dark: '#b58863',
    coordLight: '#b58863',
    coordDark: '#f0d9b5',
  },
  slate: {
    light: '#cbd5e1',
    dark: '#475569',
    coordLight: '#475569',
    coordDark: '#cbd5e1',
  },
};

const ARROW_COLORS: Record<ArrowOverlay['color'], string> = {
  emerald: '#10b981',
  sky: '#38bdf8',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  flipped,
  theme,
  boardSkin = 'default',
  interactive,
  allowedColor = 'both',
  lastMove,
  arrows = [],
  onMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: PlayerColor } | null>(
    null
  );

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();
  const inCheck = chess.inCheck();

  const canControlTurn =
    interactive && !chess.isGameOver() && (allowedColor === 'both' || allowedColor === turn);

  const legalTargets = useMemo(() => {
    const source = selectedSquare || dragFrom;
    if (!source || !canControlTurn) return new Map<string, boolean>();
    const moves = chess.moves({ square: source, verbose: true });
    const map = new Map<string, boolean>();
    for (const m of moves) {
      map.set(m.to, Boolean(m.captured));
    }
    return map;
  }, [chess, selectedSquare, dragFrom, canControlTurn]);

  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;

  const tryExecuteMove = (from: Square, to: Square) => {
    if (!canControlTurn) return false;
    const moves = chess.moves({ square: from, verbose: true });
    const matching = moves.filter((m) => m.to === to);
    if (matching.length === 0) return false;

    const isPromo = matching.some((m) => m.promotion);
    if (isPromo) {
      setPendingPromotion({ from, to, color: turn });
      setSelectedSquare(null);
      return true;
    }

    const ok = onMove(from, to);
    if (ok) {
      setSelectedSquare(null);
      setDragFrom(null);
    }
    return ok;
  };

  const handleSquareClick = (sq: Square) => {
    if (!canControlTurn) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare && legalTargets.has(sq)) {
      tryExecuteMove(selectedSquare, sq);
      return;
    }

    const piece = chess.get(sq);
    if (piece && piece.color === turn) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const squareToSvgCoords = (sq: string) => {
    const fileIdx = FILES.indexOf(sq[0]);
    const rankIdx = RANKS.indexOf(sq[1]);
    const xIdx = flipped ? 7 - fileIdx : fileIdx;
    const yIdx = flipped ? 7 - rankIdx : rankIdx;
    return {
      x: xIdx * 100 + 50,
      y: yIdx * 100 + 50,
    };
  };

  const customBoard = getBoardSkin(boardSkin);
  const colors = customBoard
    ? {
        light: customBoard.lightHex,
        dark: customBoard.darkHex,
        coordLight: customBoard.darkHex,
        coordDark: customBoard.lightHex,
      }
    : THEME_COLORS[theme];

  return (
    <div className="relative aspect-square w-full select-none rounded-xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-slate-900">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const sq = `${file}${rank}` as Square;
            const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
            const piece = chess.get(sq);
            const isSelected = selectedSquare === sq;
            const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isTarget = legalTargets.has(sq);
            const isCaptureTarget = legalTargets.get(sq) === true;
            const isKingInCheck = inCheck && piece?.type === 'k' && piece.color === turn;

            let bg = isLight ? colors.light : colors.dark;
            if (isSelected) {
              bg = isLight ? '#f6f669' : '#baca2b';
            } else if (isLastMove) {
              bg = isLight ? '#f5f682' : '#b9ca43';
            }

            return (
              <div
                key={sq}
                onClick={() => handleSquareClick(sq)}
                onDragOver={(e) => {
                  if (canControlTurn) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom && dragFrom !== sq) {
                    tryExecuteMove(dragFrom, sq);
                  }
                  setDragFrom(null);
                }}
                className="relative flex items-center justify-center cursor-pointer transition-colors duration-100"
                style={{ backgroundColor: bg }}
              >
                {/* King in check radial glow */}
                {isKingInCheck && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(239,68,68,0) 75%)',
                    }}
                  />
                )}

                {/* Rank coordinate on left edge */}
                {fIdx === 0 && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-bold leading-none pointer-events-none"
                    style={{ color: isLight ? colors.coordLight : colors.coordDark }}
                  >
                    {rank}
                  </span>
                )}

                {/* File coordinate on bottom edge */}
                {rIdx === 7 && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold leading-none pointer-events-none"
                    style={{ color: isLight ? colors.coordLight : colors.coordDark }}
                  >
                    {file}
                  </span>
                )}

                {/* Legal move indicator */}
                {isTarget && !isCaptureTarget && (
                  <div className="w-[28%] h-[28%] rounded-full bg-slate-900/25 pointer-events-none z-10" />
                )}
                {isTarget && isCaptureTarget && (
                  <div className="absolute inset-[6%] rounded-full border-[4px] sm:border-[5px] border-slate-900/25 pointer-events-none z-10" />
                )}

                {/* Chess piece */}
                {piece && (
                  <div
                    draggable={canControlTurn && piece.color === turn}
                    onDragStart={(e) => {
                      if (!canControlTurn || piece.color !== turn) {
                        e.preventDefault();
                        return;
                      }
                      setDragFrom(sq);
                      setSelectedSquare(sq);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragFrom(null)}
                    className="w-[84%] h-[84%] z-20 transition-transform duration-100 active:scale-105"
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SVG Arrow Overlay */}
      {arrows.length > 0 && (
        <svg
          viewBox="0 0 800 800"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <defs>
            {(['emerald', 'sky', 'amber', 'rose'] as const).map((c) => (
              <marker
                key={c}
                id={`arrowhead-${c}`}
                markerWidth="4"
                markerHeight="4"
                refX="2.4"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill={ARROW_COLORS[c]} />
              </marker>
            ))}
          </defs>
          {arrows.map((arrow, idx) => {
            const start = squareToSvgCoords(arrow.from);
            const end = squareToSvgCoords(arrow.to);
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;
            const shorten = 22;
            const endX = end.x - (dx / len) * shorten;
            const endY = end.y - (dy / len) * shorten;
            const startX = start.x + (dx / len) * 14;
            const startY = start.y + (dy / len) * 14;

            return (
              <line
                key={`${arrow.from}-${arrow.to}-${idx}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={ARROW_COLORS[arrow.color]}
                strokeWidth={idx === 0 ? 15 : 11}
                strokeLinecap="round"
                opacity={arrow.opacity ?? (idx === 0 ? 0.88 : 0.58)}
                markerEnd={`url(#arrowhead-${arrow.color})`}
              />
            );
          })}
        </svg>
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl text-center">
            <p className="text-sm font-semibold text-slate-200 mb-3">Chọn quân phong cấp</p>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((promo) => (
                <button
                  key={promo}
                  onClick={() => {
                    onMove(pendingPromotion.from, pendingPromotion.to, promo);
                    setPendingPromotion(null);
                  }}
                  className="w-14 h-14 p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
                >
                  <ChessPiece type={promo} color={pendingPromotion.color} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
