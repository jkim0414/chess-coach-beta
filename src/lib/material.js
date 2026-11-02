import { Chess } from 'chess.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };

/**
 * Material on the board: `taken[c]` lists the pieces of colour c that have been captured
 * (pawns, then knights, bishops, rooks, queen), and `score` is White's material lead.
 */
export function material(fen) {
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of new Chess(fen).board()) for (const p of row) if (p && p.type !== 'k') counts[p.color][p.type]++;
  const taken = { w: [], b: [] };
  let score = 0;
  for (const c of ['w', 'b']) {
    // A second queen (or third rook, …) was a pawn once: that pawn promoted, it wasn't captured.
    const promoted = ['n', 'b', 'r', 'q'].reduce((n, t) => n + Math.max(0, counts[c][t] - START[t]), 0);
    for (const t of ['p', 'n', 'b', 'r', 'q']) {
      const lost = Math.max(0, START[t] - counts[c][t] - (t === 'p' ? promoted : 0));
      for (let i = 0; i < lost; i++) taken[c].push(t);
    }
  }
  for (const t of Object.keys(VAL)) score += (counts.w[t] - counts.b[t]) * VAL[t];
  return { taken, score };
}
