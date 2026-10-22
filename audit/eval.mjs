#!/usr/bin/env node
// Engine check for reviewers: the top lines in a position, in SAN.
//
//   node audit/eval.mjs "<fen>" [depth=18] [multipv=3] [firstMoveUci]
import { createNodeEngine } from '../test/nodeWorker.js';
import { formatLine, pvToSan } from '../src/lib/chessutil.js';

const [fen, depth = '18', multipv = '3', only] = process.argv.slice(2);
if (!fen) {
  console.error('usage: node audit/eval.mjs "<fen>" [depth] [multipv] [firstMoveUci]');
  process.exit(1);
}
const engine = createNodeEngine();
const res = await engine.analyze(fen, { depth: Number(depth), multipv: Number(multipv), movetime: 30000, ...(only ? { searchmoves: [only] } : {}) });
const side = fen.split(' ')[1] === 'w' ? 1 : -1;
for (const l of res?.lines || []) {
  const sc = l.score.type === 'mate' ? `mate ${l.score.value * side}` : (l.score.value * side / 100).toFixed(2);
  console.log(`${sc.padStart(8)} (White's view)  ${formatLine(fen, pvToSan(fen, l.pv.slice(0, 12)))}`);
}
engine.terminate();
process.exit(0);
