export type AppMode = 'play' | 'openings' | 'puzzles' | 'analyze';

export type PlayerColor = 'w' | 'b';

export type BoardTheme = 'emerald' | 'wood' | 'slate';

export type MoveQuality =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book';

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreCp: number | null; // centipawns from White's perspective
  mate: number | null; // moves to mate from White's perspective (positive = White mates)
  pvUci: string[];
  pvSan: string[];
}

export interface MoveRecord {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  quality?: MoveQuality;
  evalAfterCp?: number | null;
  evalAfterMate?: number | null;
  bestMoveUci?: string;
  bestMoveSan?: string;
  cpLoss?: number;
  explanation?: string;
}

export interface ArrowOverlay {
  from: string;
  to: string;
  color: 'emerald' | 'sky' | 'amber' | 'rose';
  opacity?: number;
}

export interface SkillLevelOption {
  id: string;
  label: string;
  elo: number;
  stockfishSkill: number; // 0..20
  depth: number;
  moveTimeMs: number;
  description: string;
}

export interface OpeningLine {
  id: string;
  name: string;
  viName: string;
  eco: string;
  playerColor: PlayerColor;
  difficulty: 'Cơ bản' | 'Trung cấp' | 'Nâng cao';
  description: string;
  keyIdeas: string[];
  moves: {
    san: string;
    comment: string;
  }[];
}

export interface TacticalPuzzle {
  id: string;
  title: string;
  theme: string;
  rating: number;
  fen: string;
  solutionUci: string[];
  hint: string;
  explanation: string;
}
