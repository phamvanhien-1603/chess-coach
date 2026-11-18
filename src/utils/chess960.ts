/**
 * Generates a valid Fischer Random (Chess960) starting FEN.
 * Rules:
 *  - Bishops on opposite-colored squares
 *  - King strictly between the two Rooks
 *  - Black's back rank mirrors White's
 */
export function generateChess960Fen(): string {
  const rank = new Array<string>(8).fill('');

  // 1. Place two bishops on opposite colors (even & odd indices)
  const evenSquares = [0, 2, 4, 6];
  const oddSquares = [1, 3, 5, 7];
  const b1 = evenSquares[Math.floor(Math.random() * evenSquares.length)];
  const b2 = oddSquares[Math.floor(Math.random() * oddSquares.length)];
  rank[b1] = 'B';
  rank[b2] = 'B';

  const emptyIndices = () => rank.map((v, i) => (v === '' ? i : -1)).filter((i) => i !== -1);

  // 2. Place Queen on one of the 6 remaining squares
  const rem1 = emptyIndices();
  rank[rem1[Math.floor(Math.random() * rem1.length)]] = 'Q';

  // 3. Place two Knights
  for (let k = 0; k < 2; k++) {
    const rem = emptyIndices();
    rank[rem[Math.floor(Math.random() * rem.length)]] = 'N';
  }

  // 4. Remaining 3 squares must be Rook, King, Rook (left to right)
  const lastThree = emptyIndices();
  rank[lastThree[0]] = 'R';
  rank[lastThree[1]] = 'K';
  rank[lastThree[2]] = 'R';

  const whiteBack = rank.join('');
  const blackBack = whiteBack.toLowerCase();

  return `${blackBack}/pppppppp/8/8/8/8/PPPPPPPP/${whiteBack} w KQkq - 0 1`;
}
