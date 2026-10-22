#!/usr/bin/env node
// Validates opening courses (src/data/courses/*.js) and the opponent book (src/data/book.js).
//
//   node scripts/validate-courses.mjs                      # all courses + book, structure only
//   node scripts/validate-courses.mjs src/data/courses/italian.js --engine
//   node scripts/validate-courses.mjs --book --engine
//
// --engine      also check soundness with Stockfish (depth via --depth N, default 14)
import { Chess } from 'chess.js';
import { readdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { NodeEngine, scoreToCp } from './sf-node.mjs';

const root = join(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const useEngine = args.includes('--engine');
const depthArg = args.indexOf('--depth');
const DEPTH = depthArg >= 0 ? parseInt(args[depthArg + 1], 10) : 14;
const onlyBook = args.includes('--book');
const files = args.filter((a) => a.endsWith('.js'));

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
// Limits are in lost expected score (0..1), the same measure the app grades moves with,
// so a "worse" move in an already-winning position isn't flagged for nothing.
const LEARNER_LOSS_LIMIT = 0.05;   // ≈ 60 cp from an equal position; app calls ≤0.05 "good"
const OPP_LOSS_WARN = 0.12;        // ≈ 150 cp from an equal position
const win = (cp) => 1 / (1 + Math.exp(-0.00368208 * cp));
const lossOf = (best, mine) => win(scoreToCp(best)) - win(scoreToCp(mine));

let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log('  ✗ ' + m); };
const warn = (m) => { warnings++; console.log('  ! ' + m); };

function normMoves(moves) {
  if (typeof moves === 'string') return moves.trim().split(/\s+/).map((san) => ({ san, note: null }));
  return moves.map((m) => (typeof m === 'string' ? { san: m, note: null } : { san: m[0], note: m[1] ?? null }));
}

function playLine(moves, label) {
  const g = new Chess();
  const steps = [];
  for (let i = 0; i < moves.length; i++) {
    const fen = g.fen();
    let r = null;
    try { r = g.move(moves[i].san, { strict: false }); } catch { r = null; }
    if (!r) {
      err(`${label}: illegal move #${i + 1} "${moves[i].san}" after ${g.history().join(' ') || '(start)'}`);
      return null;
    }
    steps.push({ fen, san: r.san, uci: r.from + r.to + (r.promotion || ''), color: r.color, note: moves[i].note, given: moves[i].san });
  }
  return steps;
}

async function validateCourse(path, engine) {
  const mod = await import(pathToFileURL(resolve(path)).href);
  const c = mod.default;
  console.log(`\n▸ ${basename(path)} — ${c?.name ?? '(no name)'}`);
  if (!c || typeof c !== 'object') return err('no default export');
  for (const k of ['id', 'name', 'side', 'tagline', 'overview', 'keyIdeas', 'lines']) if (!c[k]) err(`missing field "${k}"`);
  if (c.id && basename(path, '.js') !== c.id) err(`id "${c.id}" does not match filename`);
  if (!['white', 'black'].includes(c.side)) err(`side must be "white" or "black"`);
  const learner = c.side === 'white' ? 'w' : 'b';
  const ids = new Set();
  const repertoire = new Map(); // epd -> { san, line }
  const learnerPositions = new Map(); // epd -> { fen, uci, san, line }
  const oppMoves = new Map(); // epd+uci -> { fen, uci, san, line }
  let notes = 0, learnerMoves = 0;

  for (const line of c.lines || []) {
    const label = `[${line.id}]`;
    if (!line.id) err('line without id');
    if (ids.has(line.id)) err(`duplicate line id ${line.id}`);
    ids.add(line.id);
    if (!line.name) err(`${label} missing name`);
    if (!line.group) warn(`${label} missing group`);
    const moves = normMoves(line.moves || []);
    const steps = playLine(moves, label);
    if (!steps) continue;
    if (steps.length && steps[steps.length - 1].color !== learner) err(`${label} must end with the learner's move`);
    for (const s of steps) {
      if (s.note) {
        notes++;
        if (s.note.length > 240) warn(`${label} note on ${s.san} is ${s.note.length} chars`);
      }
      const key = epd(s.fen);
      if (s.color === learner) {
        learnerMoves++;
        const prev = repertoire.get(key);
        if (prev && prev.san !== s.san) err(`${label} plays ${s.san} where [${prev.line}] plays ${prev.san} (same position — one repertoire move per position)`);
        else if (!prev) {
          repertoire.set(key, { san: s.san, line: line.id });
          learnerPositions.set(key, { fen: s.fen, uci: s.uci, san: s.san, line: line.id });
        }
      } else if (!line.trap) {
        oppMoves.set(key + s.uci, { fen: s.fen, uci: s.uci, san: s.san, line: line.id });
      }
    }
  }
  console.log(`  ${c.lines?.length ?? 0} lines, ${learnerPositions.size} unique learner positions, ${notes} notes`);

  if (engine) {
    let n = 0;
    for (const p of learnerPositions.values()) {
      n++;
      const [best] = await engine.analyse(p.fen, { depth: DEPTH });
      const [mine] = best.pv[0] === p.uci ? [best] : await engine.analyse(p.fen, { depth: DEPTH, searchmoves: [p.uci] });
      const loss = lossOf(best.score, mine.score);
      if (loss > LEARNER_LOSS_LIMIT) {
        const g = new Chess(p.fen);
        const bestSan = g.move({ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), promotion: best.pv[0][4] }).san;
        warn(`[${p.line}] learner move ${p.san} loses ${(loss * 100).toFixed(1)}% expected score vs ${bestSan} (${scoreToCp(best.score) - scoreToCp(mine.score)}cp; eval after: ${scoreToCp(mine.score)}cp for learner) — FEN ${p.fen}`);
      }
      if (n % 25 === 0) process.stdout.write(`  …checked ${n}/${learnerPositions.size}\n`);
    }
    for (const p of oppMoves.values()) {
      const [best] = await engine.analyse(p.fen, { depth: Math.min(DEPTH, 12) });
      if (best.pv[0] === p.uci) continue;
      const [mine] = await engine.analyse(p.fen, { depth: Math.min(DEPTH, 12), searchmoves: [p.uci] });
      const loss = lossOf(best.score, mine.score);
      if (loss > OPP_LOSS_WARN) warn(`[${p.line}] opponent move ${p.san} loses ${(loss * 100).toFixed(1)}% expected score in a non-trap line (fine if intentional, else mark the line trap:true)`);
    }
  }
}

async function validateBook(path, engine) {
  const mod = await import(pathToFileURL(resolve(path)).href);
  const book = mod.default;
  console.log(`\n▸ ${basename(path)} — opponent book`);
  if (!Array.isArray(book?.lines)) return err('book must export { lines: [...] }');
  const seen = new Set();
  const positions = new Map();
  for (const line of book.lines) {
    const label = `[${line.id}]`;
    if (!line.id || seen.has(line.id)) err(`missing/duplicate id ${line.id}`);
    seen.add(line.id);
    if (!line.name) err(`${label} missing name`);
    if (!Array.isArray(line.tags) || !line.tags.length) err(`${label} needs tags`);
    if (typeof line.weight !== 'number') err(`${label} needs numeric weight`);
    const steps = playLine(normMoves(line.moves), label);
    if (!steps) continue;
    for (const s of steps) positions.set(epd(s.fen) + s.uci, { ...s, line: line.id, gambit: line.tags.includes('gambit') });
  }
  console.log(`  ${book.lines.length} lines, ${positions.size} distinct book moves`);
  if (engine) {
    for (const p of positions.values()) {
      const [best] = await engine.analyse(p.fen, { depth: Math.min(DEPTH, 12) });
      if (best.pv[0] === p.uci) continue;
      const [mine] = await engine.analyse(p.fen, { depth: Math.min(DEPTH, 12), searchmoves: [p.uci] });
      const loss = lossOf(best.score, mine.score);
      const limit = p.gambit ? 0.14 : 0.08;
      if (loss > limit) warn(`[${p.line}] ${p.san} loses ${(loss * 100).toFixed(1)}% expected score (limit ${limit * 100}%) — FEN ${p.fen}`);
    }
  }
}

const engine = useEngine ? new NodeEngine() : null;
if (engine) await engine.init();

const courseDir = join(root, 'src/data/courses');
const targets = files.length ? files : onlyBook ? [] : readdirSync(courseDir).filter((f) => f.endsWith('.js')).map((f) => join(courseDir, f));
for (const f of targets) {
  if (basename(f) === 'book.js') await validateBook(f, engine);
  else await validateCourse(f, engine);
}
if (onlyBook || (!files.length)) {
  const bookPath = join(root, 'src/data/book.js');
  try { await validateBook(bookPath, engine); } catch (e) { if (onlyBook) err(`could not load book: ${e.message}`); }
}

engine?.quit();
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
