// Turn-independent board analysis: attack maps, static exchange evaluation, and
// tactical motif detection. chess.js only generates moves for the side to move, so
// everything here works from raw piece placement instead.
import { Chess } from 'chess.js';
import { VALUES, coords, onBoard, sq, opp, playLine, materialBalance, turnOf, tryMove } from './chessutil.js';

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const SEE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Map<square, {type, color}> */
export function boardOf(fenOrGame) {
  const g = typeof fenOrGame === 'string' ? new Chess(fenOrGame) : fenOrGame;
  const m = new Map();
  for (const row of g.board()) for (const p of row) if (p) m.set(p.square, { type: p.type, color: p.color });
  return m;
}

const dirsFor = (type) => (type === 'r' ? ORTHO : type === 'b' ? DIAG : type === 'q' ? [...ORTHO, ...DIAG] : []);

/** Squares attacked by the piece on `from` (regardless of whose turn it is). */
export function attacksFrom(B, from) {
  const p = B.get(from);
  if (!p) return [];
  const [f, r] = coords(from);
  const out = [];
  if (p.type === 'p') {
    const d = p.color === 'w' ? 1 : -1;
    for (const df of [-1, 1]) if (onBoard(f + df, r + d)) out.push(sq(f + df, r + d));
  } else if (p.type === 'n' || p.type === 'k') {
    for (const [df, dr] of p.type === 'n' ? KNIGHT : KING) if (onBoard(f + df, r + dr)) out.push(sq(f + df, r + dr));
  } else {
    for (const [df, dr] of dirsFor(p.type)) {
      let cf = f + df, cr = r + dr;
      while (onBoard(cf, cr)) {
        const s = sq(cf, cr);
        out.push(s);
        if (B.has(s)) break;
        cf += df; cr += dr;
      }
    }
  }
  return out;
}

export function attackersOf(B, target, color) {
  const out = [];
  for (const [s, p] of B) if (p.color === color && attacksFrom(B, s).includes(target)) out.push(s);
  return out;
}

function leastValuableAttacker(B, target, color) {
  let best = null;
  for (const s of attackersOf(B, target, color)) {
    if (!best || SEE_VAL[B.get(s).type] < SEE_VAL[B.get(best).type]) best = s;
  }
  return best;
}

/**
 * Static exchange evaluation: material `side` nets by starting a capture sequence on
 * `target` (first capture made by `firstAttacker` if given, else the cheapest). Either
 * side may stop capturing when it no longer pays. Returns null if `side` cannot capture.
 */
export function see(B, target, side, firstAttacker = null) {
  const victim = B.get(target);
  if (!victim) return null;
  const b = new Map(B);
  let a = firstAttacker ?? leastValuableAttacker(b, target, side);
  if (!a) return null;
  const gain = [SEE_VAL[victim.type]];
  let onSquare = b.get(a);
  b.set(target, onSquare);
  b.delete(a);
  let s = side;
  let d = 0;
  for (;;) {
    d++;
    s = opp(s);
    a = leastValuableAttacker(b, target, s);
    if (!a) break;
    gain[d] = SEE_VAL[onSquare.type] - gain[d - 1];
    onSquare = b.get(a);
    b.set(target, onSquare);
    b.delete(a);
  }
  while (--d > 0) gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
  return gain[0];
}

/** Pieces of `color` the opponent can win material from right now (ignores whose turn it is). */
export function hangingPieces(B, color) {
  const out = [];
  for (const [s, p] of B) {
    if (p.color !== color || p.type === 'k') continue;
    const g = see(B, s, opp(color));
    if (g !== null && g > 0) out.push({ square: s, piece: p, gain: g });
  }
  return out.sort((x, y) => y.gain - x.gain);
}

/** What the piece on `from` attacks profitably: [{square, piece, gain, check}] */
export function threatsBy(B, from) {
  const me = B.get(from);
  if (!me) return [];
  const out = [];
  for (const t of attacksFrom(B, from)) {
    const v = B.get(t);
    if (!v || v.color === me.color) continue;
    if (v.type === 'k') { out.push({ square: t, piece: v, gain: 100, check: true }); continue; }
    const g = see(B, t, me.color, from);
    if (g !== null && g > 0) out.push({ square: t, piece: v, gain: g, check: false });
  }
  return out.sort((x, y) => y.gain - x.gain);
}

/** Pins and skewers created by the slider on `from`. */
export function linesThrough(B, from) {
  const me = B.get(from);
  if (!me || !['b', 'r', 'q'].includes(me.type)) return [];
  const [f, r] = coords(from);
  const out = [];
  for (const [df, dr] of dirsFor(me.type)) {
    let cf = f + df, cr = r + dr;
    let first = null;
    while (onBoard(cf, cr)) {
      const s = sq(cf, cr);
      const p = B.get(s);
      if (p) {
        if (!first) {
          if (p.color === me.color) break;
          first = { square: s, piece: p };
        } else {
          if (p.color !== me.color) {
            const second = { square: s, piece: p };
            if (p.type === 'k' && first.piece.type !== 'k') out.push({ type: 'pin', absolute: true, pinned: first, behind: second });
            else if (first.piece.type === 'k' || SEE_VAL[first.piece.type] > SEE_VAL[p.type]) {
              if (first.piece.type === 'k' || (see(B, first.square, me.color, from) ?? 0) > 0 || SEE_VAL[first.piece.type] > SEE_VAL[me.type])
                out.push({ type: 'skewer', front: first, behind: second });
            } else if (SEE_VAL[p.type] > SEE_VAL[first.piece.type] && SEE_VAL[p.type] > SEE_VAL[me.type]) {
              out.push({ type: 'pin', absolute: false, pinned: first, behind: second });
            }
          }
          break;
        }
      }
      cf += df; cr += dr;
    }
  }
  return out;
}

/** Attacks newly opened by moving a piece off `from`: [{slider, target, piece, check, gain}] */
export function discoveredAttacks(before, after, from, color, movedTo) {
  const out = [];
  for (const [s, p] of after) {
    if (p.color !== color || s === movedTo || !['b', 'r', 'q'].includes(p.type)) continue;
    const was = new Set(attacksFrom(before, s));
    for (const t of attacksFrom(after, s)) {
      if (was.has(t)) continue;
      const v = after.get(t);
      if (!v || v.color === color) continue;
      // the newly opened line must run through the vacated square
      if (!between(s, t).includes(from)) continue;
      if (v.type === 'k') out.push({ slider: s, sliderPiece: p, target: t, piece: v, check: true, gain: 100 });
      else {
        const g = see(after, t, color, s);
        if (g !== null && g > 0) out.push({ slider: s, sliderPiece: p, target: t, piece: v, check: false, gain: g });
      }
    }
  }
  return out;
}

function between(a, b) {
  const [af, ar] = coords(a), [bf, br] = coords(b);
  const df = Math.sign(bf - af), dr = Math.sign(br - ar);
  const out = [];
  let f = af + df, r = ar + dr;
  while ((f !== bf || r !== br) && onBoard(f, r)) { out.push(sq(f, r)); f += df; r += dr; }
  return out;
}

const MOTIF_PRIORITY = ['mate', 'double-check', 'fork', 'discovered-check', 'discovered', 'skewer', 'pin', 'promotion', 'hanging', 'trapped', 'check'];

/** Tactical features of one move: [{type, ...details}] in priority order. */
export function motifsOfMove(fenBefore, uci) {
  const g = new Chess(fenBefore);
  const before = boardOf(g);
  const r = tryMove(g, uci);
  if (!r) return [];
  const after = boardOf(g);
  const color = r.color;
  const motifs = [];
  if (g.isCheckmate()) motifs.push({ type: 'mate' });
  if (r.promotion) motifs.push({ type: 'promotion', square: r.to });

  const threats = threatsBy(after, r.to);
  const movedSafe = (see(after, r.to, opp(color)) ?? 0) <= 0;
  const disc = discoveredAttacks(before, after, r.from, color, r.to);
  const directCheck = threats.some((t) => t.check);
  const discCheck = disc.some((d) => d.check);

  if (directCheck && discCheck) motifs.push({ type: 'double-check' });
  if (threats.length >= 2 && (movedSafe || directCheck)) {
    motifs.push({ type: 'fork', piece: r.piece, square: r.to, targets: threats.slice(0, 3) });
  }
  if (disc.length) {
    const d = disc.find((x) => x.check) || disc.sort((a, b) => b.gain - a.gain)[0];
    motifs.push({ type: d.check ? 'discovered-check' : 'discovered', slider: d.slider, sliderPiece: d.sliderPiece, target: d.target, piece: d.piece, moved: { piece: r.piece, square: r.to } });
  }
  for (const l of linesThrough(after, r.to)) {
    if (l.type === 'skewer') motifs.push({ type: 'skewer', front: l.front, behind: l.behind, by: { piece: r.piece, square: r.to } });
    else motifs.push({ type: 'pin', absolute: l.absolute, pinned: l.pinned, behind: l.behind, by: { piece: r.piece, square: r.to } });
  }
  if (r.captured) {
    const victimWasFree = (see(before, r.to, color, r.from) ?? 0) >= VALUES[r.captured] && VALUES[r.captured] > 0;
    if (victimWasFree) motifs.push({ type: 'hanging', piece: r.captured, square: r.to });
  }
  if (g.isCheck() && !motifs.length) motifs.push({ type: 'check', square: r.to });
  return motifs.sort((a, b) => MOTIF_PRIORITY.indexOf(a.type) - MOTIF_PRIORITY.indexOf(b.type));
}

/**
 * Follows an engine line and works out what it achieves for the side to move:
 * the material it wins once the dust settles, any mate, the motif that makes it work,
 * and how far a learner should be asked to play it out.
 */
export function analyzeLine(fen, pv, maxPlies = 12) {
  const side = turnOf(fen);
  const steps = playLine(fen, pv, maxPlies);
  const mat0 = materialBalance(fen, side);
  const mats = steps.map((s) => materialBalance(s.fenAfter, side) - mat0);
  const mateIdx = steps.findIndex((s) => s.mate);

  // Only trust material at points where the line pauses (the next move isn't a capture).
  // The line "wins" the best such count, banked at the earliest pause that reaches it —
  // so a sacrifice that is later recouped still counts, and a long PV doesn't drag on.
  const stables = [];
  for (let i = 0; i < steps.length; i++) {
    const next = steps[i + 1];
    // At the end of the line, a capture counts if the piece can't simply be taken back.
    const quietAfter = next
      ? !next.captured && !next.promotion
      : !steps[i].captured || (see(boardOf(steps[i].fenAfter), steps[i].to, opp(steps[i].color)) ?? 0) <= 0;
    if (quietAfter) stables.push(i);
  }
  const best = stables.length ? Math.max(...stables.map((i) => mats[i])) : 0;
  const bankedAt = stables.find((i) => mats[i] >= best - 0.5);
  const gain = mateIdx >= 0 ? 99 : stables.length ? mats[bankedAt] : 0;

  // The ply at which the gain is banked must be one of our moves.
  let keyIdx = 0;
  if (mateIdx >= 0) keyIdx = mateIdx;
  else if (gain > 0) keyIdx = bankedAt;
  if (steps[keyIdx]?.color !== side) keyIdx = Math.max(0, keyIdx - 1);

  let motif = null;
  for (let i = 0; i <= Math.min(keyIdx, 4) && !motif; i += 2) {
    const ms = steps[i] ? motifsOfMove(steps[i].fenBefore, steps[i].uci) : [];
    const pick = ms.find((m) => m.type !== 'check');
    if (pick) motif = { ...pick, ply: i };
  }
  if (mateIdx >= 0) {
    const mateMove = steps[mateIdx];
    const backRank = isBackRankMate(mateMove);
    motif = { type: backRank ? 'back-rank' : 'mate', ply: mateIdx, inMoves: Math.floor(mateIdx / 2) + 1, lead: motif };
  }
  if (!motif && gain >= 1) motif = { type: 'material', ply: 0 };
  if (!motif && steps[0] && motifsOfMove(steps[0].fenBefore, steps[0].uci).some((m) => m.type === 'check')) motif = { type: 'check', ply: 0 };

  return { side, steps, gain, mateIdx, keyIdx, motif, mats };
}

function isBackRankMate(step) {
  if (!['r', 'q'].includes(step.piece)) return false;
  const rank = step.to[1];
  const g = new Chess(step.fenAfter);
  const loser = g.turn();
  const backRank = loser === 'w' ? '1' : '8';
  if (rank !== backRank) return false;
  const k = g.board().flat().find((p) => p && p.type === 'k' && p.color === loser);
  return k && k.square[1] === backRank;
}

/** Squares within one step of the king (its "zone"). */
export function kingZone(B, color) {
  let ks = null;
  for (const [s, p] of B) if (p.type === 'k' && p.color === color) ks = s;
  if (!ks) return [];
  const [f, r] = coords(ks);
  const out = [ks];
  for (const [df, dr] of KING) if (onBoard(f + df, r + dr)) out.push(sq(f + df, r + dr));
  return out;
}

export function countAttacks(B, color, squares) {
  const set = new Set(squares);
  let n = 0;
  for (const [s, p] of B) if (p.color === color) for (const t of attacksFrom(B, s)) if (set.has(t)) n++;
  return n;
}
