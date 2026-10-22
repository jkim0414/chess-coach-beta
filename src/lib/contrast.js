// "Why was the other move better?" — compares the move you played with the engine's choice
// on the same jobs: what both do, what the better move also does, and what yours costs.
// Every clause is checked on the board or in the engine's lines; if nothing concrete can
// be said, it returns null and the caller falls back to plainer wording.
import { NAMES, VALUES, COLOR_NAME, formatLine, opp, playLine, turnOf } from './chessutil.js';
import { boardOf, hangingPieces, threatsBy, attacksFrom, see } from './tactics.js';
import { positionalReasons, settle, joinAnd } from './explain.js';

const pn = (t) => NAMES[t];
const num = (st) => formatLine(st.fenBefore, [st.san]);
const BACK = { w: '1', b: '8' };
const ORDER = ['take', 'save', 'castle', 'develop', 'attack'];

/** Does the opponent capture on `square` within the first few moves of the line? */
const takenIn = (steps, square, side) => steps.slice(1, 5).some((s) => s.color !== side && s.captured && s.to === square);

/** What a move accomplishes, as comparable facts: { key, kind, ... }. */
function jobsOf(fen, step, side) {
  const B0 = boardOf(fen);
  const B1 = boardOf(step.fenAfter);
  const moveNo = parseInt(fen.split(' ')[5] || '1', 10);
  const jobs = [];
  // Deals with an attack on one of your pieces (by moving it, defending it, or blocking).
  const loose1 = new Set(hangingPieces(B1, side).map((h) => h.square));
  for (const h of hangingPieces(B0, side)) {
    const now = h.square === step.from ? step.to : h.square;
    if (B1.get(now)?.color === side && !loose1.has(now)) jobs.push({ key: `save:${h.square}`, kind: 'save', type: h.piece.type, square: h.square });
  }
  if (step.san.startsWith('O-O')) jobs.push({ key: 'castle', kind: 'castle' });
  else if (['n', 'b'].includes(step.piece) && step.from[1] === BACK[side] && moveNo <= 15) jobs.push({ key: 'develop', kind: 'develop', piece: step.piece, check: !!step.check });
  const won = step.captured ? see(B0, step.to, side, step.from) ?? 0 : 0;
  if (won > 0) {
    // Free, or for the piece that took it.
    const forWhat = won < VALUES[step.captured] ? ` for your ${pn(step.piece)}` : '';
    jobs.push({ key: `take:${step.to}:${step.piece}`, kind: 'take', square: step.to, what: `${pn(step.captured)} on ${step.to}${forWhat}` });
  }
  // A new attack, from a square where the piece is safe.
  const safe = (see(B1, step.to, opp(side)) ?? 0) <= 0;
  if (!step.check && safe) {
    const before = new Set(attacksFrom(B0, step.from));
    const t = threatsBy(B1, step.to).find((x) => !x.check && !before.has(x.square));
    if (t) jobs.push({ key: `attack:${t.square}`, kind: 'attack', what: `${pn(t.piece.type)} on ${t.square}` });
  }
  return jobs.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** Jobs as a verb phrase: singular ("develops the bishop") or plural ("develop a piece"). */
function phrase(jobs, plural = false) {
  const parts = [];
  for (const kind of ORDER) {
    const js = jobs.filter((j) => j.kind === kind);
    if (!js.length) continue;
    if (kind === 'save') parts.push(`${plural ? 'deal' : 'deals'} with the attack${js.length > 1 ? 's' : ''} on your ${group(js)}`);
    if (kind === 'take') parts.push(`${plural ? 'win' : 'wins'} the ${js[0].what}`);
    if (kind === 'castle') parts.push(plural ? 'castle' : 'castles, getting the king to safety');
    if (kind === 'develop') parts.push(plural ? 'develop a piece' : `develops the ${pn(js[0].piece)}${js[0].check ? ' with check' : ''}`);
    if (kind === 'attack') parts.push(`${plural ? 'attack' : 'attacks'} the ${js[0].what}`);
  }
  return joinAnd(parts.slice(0, 2));
}

/** "pawns on e6 and e5" for several of one kind, else "pawn on e6 and knight on d4". */
function group(js) {
  const types = new Set(js.map((j) => j.type));
  if (js.length > 1 && types.size === 1) return `${pn(js[0].type)}s on ${joinAnd(js.map((j) => j.square))}`;
  return joinAnd(js.map((j) => `${pn(j.type)} on ${j.square}`));
}

const canCastle = (fen, side) => {
  const rights = fen.split(' ')[2] || '-';
  return side === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
};

/**
 * What the move (and the engine's line after it) costs you, compared with the better move:
 * `verb`s complete "<move> …"; a `clause` stands on its own.
 */
function costsOf(fen, step, pv, side, other) {
  const B0 = boardOf(fen);
  const B1 = boardOf(step.fenAfter);
  const Them = COLOR_NAME[opp(side)];
  const costs = [];
  // A pawn move that takes a square from one of your undeveloped pieces.
  if (step.piece === 'p' && !step.captured) {
    const blocked = [...B0].find(([sq, p]) => p.color === side && ['n', 'b'].includes(p.type) && sq[1] === BACK[side] && attacksFrom(B0, sq).includes(step.to));
    if (blocked && !B0.get(step.to)) costs.push({ verb: `takes ${step.to} away from your ${pn(blocked[1].type)} on ${blocked[0]}` });
  }
  // Something of yours left hanging that the better move wouldn't leave hanging. (A capture
  // that can be taken back is a trade, not a hanging piece.)
  const trade = step.captured && (see(B0, step.to, side, step.from) ?? 0) >= 0;
  const home = (h, st) => (h.square === st.to ? st.from : h.square);
  const otherLoose = new Set(hangingPieces(boardOf(other.step.fenAfter), side).map((h) => home(h, other.step)));
  const steps = playLine(fen, pv, 8);
  // …and only if the engine's line really takes it: a static count can miss why taking is bad.
  const loose = hangingPieces(B1, side).find((h) => !otherLoose.has(home(h, step)) && !(trade && h.square === step.to) && takenIn(steps, h.square, side));
  if (loose) costs.push({ verb: `leaves your ${pn(loose.piece.type)} on ${loose.square} hanging` });
  // Castling rights: lost by the move itself, or forced out of you in the line.
  const keeps = (st) => st.slice(0, 6).every((s) => canCastle(s.fenAfter, side) || s.san.startsWith('O-O'));
  if (canCastle(fen, side) && keeps(other.steps)) {
    if (!canCastle(step.fenAfter, side) && !step.san.startsWith('O-O')) costs.push({ verb: 'gives up the right to castle' });
    else {
      const i = steps.slice(0, 6).findIndex((s) => s.color === side && !canCastle(s.fenAfter, side) && !s.san.startsWith('O-O'));
      if (i >= 1) costs.push({ verb: `costs you the right to castle (${formatLine(steps[i - 1].fenBefore, [steps[i - 1].san, steps[i].san])})` });
    }
  }
  // Losing time: the reply attacks a piece and you have to move it again.
  const r1 = steps[1], s2 = steps[2];
  if (r1 && s2 && !r1.captured && other.steps[1]?.san !== r1.san) {
    const hit = threatsBy(boardOf(r1.fenAfter), r1.to).find((t) => !t.check && t.square === s2.from);
    if (hit) costs.push({ verb: `lets ${Them} gain time with ${num(r1)}, which hits your ${pn(hit.piece.type)} on ${hit.square}` });
  }
  // A lasting weakness the better line doesn't have — unless your line won material for it.
  const end = (line) => { const { U, end: e } = settle(fen, line); const i = Math.max(0, e); return { fen: U.steps[i]?.fenAfter, mat: U.mats[i] ?? 0 }; };
  const mineEnd = end(pv), theirEnd = end(other.pv);
  if (mineEnd.fen && theirEnd.fen && mineEnd.mat <= theirEnd.mat) {
    const theirs = new Set(positionalReasons(fen, theirEnd.fen, side));
    const extra = positionalReasons(fen, mineEnd.fen, side).find((x) => !theirs.has(x));
    if (extra) costs.push({ clause: extra });
  }
  return costs;
}

/**
 * Contrast `playedUci` with `bestUci` from `fen`, using the engine's lines after each
 * (`playedPv`, `bestPv`, both starting with the move). Returns { text, why } — `text`: one
 * or two sentences comparing them; `why`: what the better move does, as "which …" — or null
 * when nothing concrete separates them.
 */
export function contrastMoves({ fen, playedUci, bestUci, playedPv, bestPv }) {
  if (!playedUci || !bestUci || playedUci === bestUci) return null;
  const side = turnOf(fen);
  const [pm] = playLine(fen, [playedUci]);
  const [bm] = playLine(fen, [bestUci]);
  if (!pm || !bm) return null;
  const pPv = playedPv?.[0] === playedUci ? playedPv : [playedUci];
  const bPv = bestPv?.[0] === bestUci ? bestPv : [bestUci];
  const P = num(pm), Bm = num(bm);

  const pj = jobsOf(fen, pm, side), bj = jobsOf(fen, bm, side);
  const shared = pj.filter((j) => bj.some((k) => k.key === j.key));
  // The better move's extra jobs — minus anything your own line does a move or two later anyway.
  const mine = playLine(fen, pPv, 6).filter((s) => s.color === side);
  const extras = bj.filter((j) => !pj.some((k) => k.key === j.key)).filter((j) => {
    if (j.kind === 'take') return !mine.slice(0, 3).some((s) => s.captured && s.to === j.square);
    if (j.kind === 'castle') return !mine.slice(0, 3).some((s) => s.san.startsWith('O-O'));
    if (j.kind === 'save') return takenIn(playLine(fen, pPv, 6), j.square, side); // it really was lost after your move
    return true;
  });
  const costs = costsOf(fen, pm, pPv, side, { step: bm, pv: bPv, steps: playLine(fen, bPv, 8) }).slice(0, 2);

  const verbs = costs.filter((c) => c.verb).map((c) => c.verb);
  const clause = costs.find((c) => c.clause)?.clause;
  const playedPart = verbs.length ? `${P} ${joinAnd(verbs)}${clause ? `, and later ${clause}` : ''}` : clause ? `after ${P}, ${clause}` : '';
  const bestDoes = phrase(extras);
  // A structural side effect alone ("an isolated a-pawn") isn't the reason one move beat the other.
  if (!bestDoes && !verbs.length) return null;

  const out = [];
  if (shared.length) out.push(`Both ${P} and ${Bm} ${phrase(shared, true)}.`);
  if (bestDoes && playedPart) out.push(`${Bm} ${shared.length ? 'also ' : ''}${bestDoes}, while ${playedPart}.`);
  else if (bestDoes) out.push(shared.length ? `${Bm} also ${bestDoes}.` : `${Bm} was more precise: it ${bestDoes}.`);
  else out.push(`${capitalizeFirst(playedPart)}.${shared.length ? '' : ` Better was ${Bm}.`}`);
  return { text: out.join(' '), why: bestDoes ? `which ${phrase([...shared, ...extras])}` : null };
}

const capitalizeFirst = (s) => s[0].toUpperCase() + s.slice(1);
