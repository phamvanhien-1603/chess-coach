import { Chess, type Square } from 'chess.js';
import type { EngineLine, MoveQuality, PlayerColor, SkillLevelOption } from '../types/chess';

export const SKILL_LEVELS: SkillLevelOption[] = [
  {
    id: 'beginner',
    label: 'Tập sự',
    elo: 800,
    stockfishSkill: 1,
    depth: 4,
    moveTimeMs: 250,
    description: 'Phù hợp cho người mới làm quen luật và các đòn cơ bản.',
  },
  {
    id: 'casual',
    label: 'Nghiệp dư',
    elo: 1200,
    stockfishSkill: 5,
    depth: 7,
    moveTimeMs: 400,
    description: 'Biết phát triển quân và tận dụng sai lầm lớn.',
  },
  {
    id: 'intermediate',
    label: 'Trung cấp',
    elo: 1600,
    stockfishSkill: 10,
    depth: 10,
    moveTimeMs: 550,
    description: 'Chơi chắc chắn, có chiến thuật rõ ràng.',
  },
  {
    id: 'advanced',
    label: 'Cao thủ',
    elo: 2000,
    stockfishSkill: 15,
    depth: 13,
    moveTimeMs: 750,
    description: 'Tính toán sâu, trừng phạt ngay mọi sơ hở nhỏ.',
  },
  {
    id: 'master',
    label: 'Đại kiện tướng',
    elo: 2600,
    stockfishSkill: 20,
    depth: 16,
    moveTimeMs: 1000,
    description: 'Sức mạnh tối đa của Stockfish 19.',
  },
];

const PIECE_NAMES_VI: Record<string, string> = {
  p: 'Tốt',
  n: 'Mã',
  b: 'Tượng',
  r: 'Xe',
  q: 'Hậu',
  k: 'Vua',
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export const QUALITY_META: Record<
  MoveQuality,
  { label: string; colorClass: string; badgeBg: string; dotColor: string }
> = {
  best: {
    label: 'Tối ưu',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    dotColor: '#10b981',
  },
  excellent: {
    label: 'Xuất sắc',
    colorClass: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 border-teal-500/40 text-teal-300',
    dotColor: '#14b8a6',
  },
  good: {
    label: 'Tốt',
    colorClass: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    dotColor: '#38bdf8',
  },
  book: {
    label: 'Khai cuộc chuẩn',
    colorClass: 'text-violet-400',
    badgeBg: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
    dotColor: '#a78bfa',
  },
  inaccuracy: {
    label: 'Thiếu chính xác',
    colorClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    dotColor: '#fbbf24',
  },
  mistake: {
    label: 'Sai lầm',
    colorClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    dotColor: '#fb923c',
  },
  blunder: {
    label: 'Sai lầm nghiêm trọng',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    dotColor: '#f43f5e',
  },
};

export function normalizeScoreForMover(
  scoreCp: number | null | undefined,
  mate: number | null | undefined,
  moverColor: PlayerColor
): number {
  const sign = moverColor === 'w' ? 1 : -1;
  if (mate !== null && mate !== undefined) {
    const mateVal = mate > 0 ? 10000 - Math.abs(mate) * 10 : -10000 + Math.abs(mate) * 10;
    return mateVal * sign;
  }
  return (scoreCp ?? 0) * sign;
}

export function formatEval(scoreCp: number | null | undefined, mate: number | null | undefined): string {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }
  if (scoreCp === null || scoreCp === undefined) return '0.0';
  const pawns = scoreCp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export function classifyMove(
  moverColor: PlayerColor,
  bestLineBefore: EngineLine | undefined,
  bestLineAfter: EngineLine | undefined,
  playedUci: string
): { quality: MoveQuality; cpLoss: number } {
  if (!bestLineBefore || !bestLineAfter) {
    return { quality: 'good', cpLoss: 0 };
  }

  const bestUciBefore = bestLineBefore.pvUci[0];
  const scoreBefore = normalizeScoreForMover(bestLineBefore.scoreCp, bestLineBefore.mate, moverColor);
  const scoreAfter = normalizeScoreForMover(bestLineAfter.scoreCp, bestLineAfter.mate, moverColor);
  const cpLoss = Math.max(0, scoreBefore - scoreAfter);

  if (playedUci === bestUciBefore) {
    return { quality: 'best', cpLoss: 0 };
  }
  if (cpLoss <= 20) return { quality: 'excellent', cpLoss };
  if (cpLoss <= 65) return { quality: 'good', cpLoss };
  if (cpLoss <= 140) return { quality: 'inaccuracy', cpLoss };
  if (cpLoss <= 290) return { quality: 'mistake', cpLoss };
  return { quality: 'blunder', cpLoss };
}

export function explainMoveVi(
  fenBefore: string,
  uci: string,
  quality: MoveQuality,
  cpLoss: number,
  bestMoveSan?: string
): string {
  const chess = new Chess(fenBefore);
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? uci[4] : undefined;

  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    return 'Nước đi hợp lệ.';
  }
  if (!move) return 'Nước đi hợp lệ.';

  const pieceName = PIECE_NAMES_VI[move.piece] || 'Quân';
  const details: string[] = [];

  if (chess.isCheckmate()) {
    return `Chiếu hết! Nước ${move.san} kết thúc ván đấu hoàn hảo.`;
  }

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    details.push('Nhập thành đưa Vua vào vị trí an toàn và kết nối Xe.');
  } else if (move.captured) {
    const capName = PIECE_NAMES_VI[move.captured] || 'quân';
    details.push(`${pieceName} ăn ${capName} tại ${to}.`);
  } else if (move.promotion) {
    const promoName = PIECE_NAMES_VI[move.promotion] || 'Hậu';
    details.push(`Phong cấp Tốt thành ${promoName} tại ${to}!`);
  } else if (['e4', 'd4', 'e5', 'd5'].includes(to)) {
    details.push(`${pieceName} tiến ra kiểm soát khu vực trung tâm (${to}).`);
  } else if ((move.piece === 'n' || move.piece === 'b') && (from[1] === '1' || from[1] === '8')) {
    details.push(`Phát triển ${pieceName} lên ${to} giúp tăng cường kiểm soát bàn cờ.`);
  }

  if (chess.inCheck()) {
    details.push('Đồng thời chiếu Vua đối phương.');
  }

  // Check if moved piece is now hanging or attacked by a lower-value piece
  const movedColor = move.color;
  const oppColor = movedColor === 'w' ? 'b' : 'w';
  const isAttacked = chess.isAttacked(to, oppColor);
  const isDefended = chess.isAttacked(to, movedColor);
  if (isAttacked && !isDefended && move.piece !== 'p') {
    details.push(`Lưu ý: ${pieceName} tại ${to} đang không có quân bảo vệ.`);
  }

  if (quality === 'best' || quality === 'excellent') {
    const prefix = quality === 'best' ? 'Nước đi tối ưu!' : 'Nước đi xuất sắc!';
    return details.length > 0 ? `${prefix} ${details.join(' ')}` : `${prefix} Duy trì thế trận rất tốt.`;
  }

  if (quality === 'good') {
    return details.length > 0 ? details.join(' ') : 'Nước đi hợp lý, giữ vững thế cân bằng.';
  }

  const lossText = cpLoss > 0 ? ` (mất khoảng ${(cpLoss / 100).toFixed(1)} điểm lợi thế)` : '';
  const altText = bestMoveSan ? ` Nước mạnh hơn là ${bestMoveSan}.` : '';

  if (quality === 'inaccuracy') {
    return `Hơi thiếu chính xác${lossText}.${altText} ${details.join(' ')}`.trim();
  }
  if (quality === 'mistake') {
    return `Sai lầm${lossText}!${altText} Bạn nên kiểm tra kỹ các quân đang bị tấn công hoặc cơ hội chiến thuật.`;
  }
  return `Sai lầm nghiêm trọng${lossText}!${altText} Nước đi này tạo ra sơ hở lớn cho đối phương khai thác.`;
}

export function explainBestMoveHintVi(fen: string, bestLine: EngineLine): string {
  const bestUci = bestLine.pvUci[0];
  if (!bestUci || bestUci.length < 4) return 'Chưa có gợi ý.';

  const chess = new Chess(fen);
  const from = bestUci.slice(0, 2) as Square;
  const to = bestUci.slice(2, 4) as Square;
  const promotion = bestUci.length > 4 ? bestUci[4] : undefined;

  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    return `Gợi ý: ${bestLine.pvSan[0] || bestUci}`;
  }

  const pieceName = PIECE_NAMES_VI[move.piece] || 'Quân';
  const reasons: string[] = [];

  if (bestLine.mate !== null && bestLine.mate !== undefined) {
    const turn = fen.split(' ')[1];
    const isMyMate = (turn === 'w' && bestLine.mate > 0) || (turn === 'b' && bestLine.mate < 0);
    if (isMyMate) {
      reasons.push(`Dẫn tới chiếu hết trong ${Math.abs(bestLine.mate)} nước!`);
    }
  }

  if (chess.isCheckmate()) {
    return `Nước ${move.san}: Chiếu hết ngay lập tức!`;
  }

  if (move.captured) {
    const capName = PIECE_NAMES_VI[move.captured] || 'quân';
    const gain = PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
    if (gain > 0) {
      reasons.push(`ăn ${capName} có giá trị cao hơn`);
    } else {
      reasons.push(`ăn ${capName} tại ${to}`);
    }
  }

  if (chess.inCheck()) {
    reasons.push('chiếu Vua gây sức ép buộc đối phương phải chống đỡ');
  }

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    reasons.push('nhập thành để bảo vệ Vua và đưa Xe vào trung lộ');
  } else if (['e4', 'd4', 'e5', 'd5'].includes(to)) {
    reasons.push(`chiếm lĩnh ô trung tâm ${to}`);
  } else if ((move.piece === 'n' || move.piece === 'b') && (from[1] === '1' || from[1] === '8')) {
    reasons.push(`phát triển ${pieceName} lên vị trí tích cực`);
  }

  if (reasons.length === 0) {
    reasons.push(`cải thiện vị trí ${pieceName} và tối ưu hóa phối hợp quân`);
  }

  return `Nước tốt nhất là ${move.san} (${from} → ${to}): giúp ${reasons.join(', ')}.`;
}

export async function askGeminiCoach(
  apiKey: string,
  fen: string,
  historySan: string[],
  bestLines: EngineLine[],
  customQuestion?: string
): Promise<string> {
  const topLinesText = bestLines
    .slice(0, 3)
    .map(
      (l, i) =>
        `#${i + 1}: ${l.pvSan.slice(0, 4).join(' ')} (Đánh giá: ${formatEval(l.scoreCp, l.mate)})`
    )
    .join('\n');

  const prompt = `Bạn là Đại kiện tướng & Huấn luyện viên Cờ vua chuyên nghiệp. Hãy trả lời ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt (tối đa 4-5 câu) để giúp người chơi nâng cao trình độ.

Trạng thái bàn cờ (FEN): ${fen}
Các nước đã đi: ${historySan.length > 0 ? historySan.join(' ') : 'Bắt đầu ván đấu'}
Phân tích từ Stockfish 19:
${topLinesText || 'Đang phân tích'}

${customQuestion ? `Câu hỏi của học viên: ${customQuestion}` : 'Hãy giải thích ý đồ chiến lược/chiến thuật của thế cờ hiện tại và tại sao nước đi tốt nhất lại mạnh.'}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 350,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được phản hồi từ Gemini.');
  return text.trim();
}
