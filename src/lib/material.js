import { Chess } from 'chess.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export function material(fen) {
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of new Chess(fen).board()) for (const p of row) if (p && p.type !== 'k') counts[p.color][p.type]++;
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const taken = { w: [], b: [] }; // pieces of that colour that have been captured
  let score = 0;
  for (const c of ['w', 'b']) {
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const lost = Math.max(0, start[t] - counts[c][t]);
      for (let i = 0; i < lost; i++) taken[c].push(t);
    }
  }
  for (const t of Object.keys(VAL)) score += (counts.w[t] - counts.b[t]) * VAL[t];
  return { taken, score };
}
