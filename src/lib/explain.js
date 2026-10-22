// The coach's words. Everything here is derived from concrete board facts
// (attack maps, exchanges, engine lines) so explanations stay truthful.
import { Chess } from 'chess.js';
import { NAMES, VALUES, COLOR_NAME, formatLine, opp, turnOf, playLine, coords, nullMoveFen, narrate } from './chessutil.js';
import { analyzeLine, boardOf, hangingPieces, see, threatsBy, attackersOf, attacksFrom } from './tactics.js';
import { verdict } from './evaluation.js';

export const MOTIFS = {
  fork: { name: 'Fork', hint: 'Look for one move that attacks two things at once.', theme: 'fork' },
  pin: { name: 'Pin', hint: 'A piece can’t move without exposing something more valuable behind it.', theme: 'pin' },
  skewer: { name: 'Skewer', hint: 'Attack a valuable piece that has something else lined up behind it.', theme: 'skewer' },
  discovered: { name: 'Discovered attack', hint: 'Move one piece out of the way to unleash another behind it.', theme: 'discoveredAttack' },
  'discovered-check': { name: 'Discovered check', hint: 'Uncover a check — the piece you move is then free to do damage.', theme: 'discoveredAttack' },
  'double-check': { name: 'Double check', hint: 'Give check with two pieces at once — only a king move helps.', theme: 'doubleCheck' },
  hanging: { name: 'Loose piece', hint: 'Something isn’t defended. Count attackers and defenders.', theme: 'hangingPiece' },
  mate: { name: 'Checkmate', hint: 'There’s a forced mate. Look at every check.', theme: 'mate' },
  'back-rank': { name: 'Back-rank mate', hint: 'The king is boxed in behind its own pawns.', theme: 'backRankMate' },
  promotion: { name: 'Promotion', hint: 'A pawn is close to queening — what stops it?', theme: 'promotion' },
  material: { name: 'Winning material', hint: 'A forcing sequence wins material. Checks, captures, threats — in that order.', theme: 'advantage' },
  check: { name: 'Forcing check', hint: 'Start with a check and see what it sets up.', theme: 'advantage' },
  defend: { name: 'Defence', hint: 'Only one move holds. First ask: what is my opponent threatening?', theme: 'defensiveMove' },
};

const pn = (t) => NAMES[t];
const them = (side) => COLOR_NAME[opp(side)];
/** SAN as written in prose: Black moves get a leading ellipsis. */
export const prose = (color, san) => (color === 'b' ? '…' : '') + san;

export function materialPhrase(gain) {
  if (gain >= 8) return 'about a queen’s worth of material';
  if (gain >= 5) return 'a rook’s worth of material';
  if (gain >= 3) return 'a piece';
  if (gain === 2) return 'about two pawns’ worth of material';
  if (gain >= 1) return 'a pawn';
  return 'nothing';
}

/** What the side capturing actually takes home: "the knight on c6", "the exchange". */
export function winningsPhrase(L) {
  const end = L.mateIdx >= 0 ? L.mateIdx : Math.max(L.keyIdx, 0);
  const ours = [], theirs = [];
  L.steps.slice(0, end + 2).forEach((s) => {
    if (!s.captured) return;
    (s.color === L.side ? ours : theirs).push({ type: s.captured, square: s.to });
  });
  if (ours.length === 1 && theirs.length === 0) return ours[0].type === 'p' ? `the pawn on ${ours[0].square}` : `the ${pn(ours[0].type)} on ${ours[0].square}`;
  const top = ours.sort((a, b) => VALUES[b.type] - VALUES[a.type])[0];
  if (top && theirs.length === 1 && top.type === 'r' && ['n', 'b'].includes(theirs[0].type)) return 'the exchange';
  const pawns = ours.filter((x) => x.type === 'p').length - theirs.filter((x) => x.type === 'p').length;
  if (L.gain === 2 && pawns >= 2) return 'two pawns';
  return materialPhrase(L.gain);
}

/** One clause describing a motif. `label` overrides how the move is named (e.g. "12.Rg3"). */
export function describeMotif(m, steps, label) {
  if (!m) return '';
  const st = steps?.[m.ply ?? 0];
  const mv = label ?? (st ? prose(st.color, st.san) : '');
  const tgt = (t) => (t.piece.type === 'k' ? 'king' : `${pn(t.piece.type)} on ${t.square}`);
  switch (m.type) {
    case 'fork': {
      const ts = m.targets.map(tgt);
      return `${mv} forks the ${ts.slice(0, -1).join(', the ')} and the ${ts[ts.length - 1]}`;
    }
    case 'pin':
      return m.absolute
        ? `${mv} pins the ${pn(m.pinned.piece.type)} on ${m.pinned.square} to the king — it can’t legally move`
        : `${mv} pins the ${pn(m.pinned.piece.type)} on ${m.pinned.square} to the ${pn(m.behind.piece.type)} behind it`;
    case 'skewer':
      return `${mv} skewers the ${m.front.piece.type === 'k' ? 'king' : pn(m.front.piece.type)}: once it moves, the ${pn(m.behind.piece.type)} on ${m.behind.square} falls`;
    case 'discovered':
      return `${mv} moves the ${pn(m.moved.piece)} out of the way and uncovers the ${pn(m.sliderPiece.type)}’s attack on the ${pn(m.piece.type)} on ${m.target}`;
    case 'discovered-check':
      return `${mv} is a discovered check from the ${pn(m.sliderPiece.type)} on ${m.slider} — and the ${pn(m.moved.piece)} gets a free move`;
    case 'double-check':
      return `${mv} is a double check — the king has to move`;
    case 'hanging':
      return m.defenders
        ? `${mv} takes the ${pn(m.piece)} on ${m.square}, which wasn’t defended enough`
        : `${mv} takes the ${pn(m.piece)} on ${m.square}, which was undefended`;
    case 'promotion':
      return `${mv} promotes the pawn`;
    case 'back-rank':
      return 'the king is trapped behind its own pawns on the back rank';
    case 'check':
      return `${mv} starts with a forcing check`;
    default:
      return '';
  }
}

/** Explains a winning/best engine line for the side to move. */
export function explainLine(fen, pv) {
  const L = analyzeLine(fen, pv, 12);
  if (!L.steps.length) return { L, text: '' };
  const showTo = L.mateIdx >= 0 ? L.mateIdx + 1 : L.gain >= 1 ? L.keyIdx + 1 : Math.min(L.steps.length, 4);
  const line = formatLine(fen, L.steps.slice(0, showTo).map((s) => s.san));
  let text;
  if (L.mateIdx >= 0) {
    const n = Math.floor(L.mateIdx / 2) + 1;
    const how = L.motif?.type === 'back-rank' ? ' The king is trapped on the back rank.' : '';
    text = n === 1 ? `Mate in one: ${line}.${how}` : `Forced mate in ${n}: ${line}.${how}`;
  } else if (L.gain >= 1) {
    const why = describeMotif(L.motif, L.steps);
    text = `${why ? capitalize(why) + '. ' : ''}${line} wins ${winningsPhrase(L)}.`;
  } else {
    const s0 = L.steps[0];
    text = `${prose(s0.color, s0.san)} ${describeQuietMove(fen, s0.uci)}. A likely continuation: ${line}.`;
  }
  return { L, text, line };
}

/**
 * Why the move just played is bad. Returns `why` (safe to show before the learner
 * retries — it never names the better move) and `refutation` (the punishing line).
 */
export function explainMistake({ fen, uci, movePv, winBefore, winAfter }) {
  const side = turnOf(fen);
  const [mv] = playLine(fen, [uci]);
  if (!mv) return { why: '', refutation: '' };
  const reply = movePv?.slice(1) ?? [];
  const R = analyzeLine(mv.fenAfter, reply, 10);
  const r0 = R.steps[0];
  const refShowTo = R.mateIdx >= 0 ? R.mateIdx + 1 : Math.min(R.steps.length, Math.max(R.keyIdx + 1, 1));
  const refutation = r0 ? narrate(R.steps.slice(0, refShowTo)) : '';
  const yourMove = prose(mv.color, mv.san);
  const T = them(side);

  if (R.mateIdx >= 0) {
    const n = Math.floor(R.mateIdx / 2) + 1;
    return { why: `After ${yourMove}, ${T} has a forced mate${n > 1 ? ` in ${n}` : ''}.`, refutation, motif: R.motif, kind: 'mate' };
  }

  if (r0 && R.gain >= 1) {
    const before = boardOf(fen);
    const after = boardOf(mv.fenAfter);
    const hungBefore = new Set(hangingPieces(before, side).map((h) => h.square));
    const hungAfter = hangingPieces(after, side);
    const won = winningsPhrase(R);

    if (r0.to === mv.to && r0.captured) {
      const a = attackersOf(after, mv.to, opp(side)).length;
      const d = attackersOf(after, mv.to, side).length;
      const count = d === 0 ? 'nothing defends it' : `it’s attacked ${a}× and defended only ${d}×`;
      return { why: `Your ${pn(mv.piece)} on ${mv.to} isn’t safe there — ${count}.`, refutation, motif: { type: 'hanging' }, kind: 'hangs' };
    }
    if (r0.captured && hungBefore.has(r0.to) && r0.to !== mv.from) {
      return { why: `This ignores the threat: your ${pn(r0.captured)} on ${r0.to} was already under attack and is still loose.`, refutation, motif: { type: 'hanging' }, kind: 'ignored-threat' };
    }
    const newlyLoose = hungAfter.find((h) => !hungBefore.has(h.square) && h.square !== mv.to);
    if (newlyLoose && r0.to === newlyLoose.square) {
      return { why: `Moving the ${pn(mv.piece)} left your ${pn(newlyLoose.piece.type)} on ${newlyLoose.square} without enough protection.`, refutation, motif: { type: 'hanging' }, kind: 'removed-defender' };
    }
    const m = describeMotif(R.motif, R.steps);
    return {
      why: m ? `It walks into a tactic: ${m}, and ${T} wins ${won}.` : `${T} has a forcing sequence that wins ${won}.`,
      refutation, motif: R.motif, kind: 'tactic',
    };
  }

  return {
    why: `It isn’t a tactical oversight, but it hands ${T} the better game — you go from ${verdict(winBefore)} to ${verdict(winAfter)}.`,
    refutation, motif: null, kind: 'positional',
  };
}

/** "What is the opponent threatening?" — from a null-move search. */
export function explainThreat(fen, nullPv) {
  const nf = nullMoveFen(fen);
  if (!nf || !nullPv?.length) return null;
  const L = analyzeLine(nf, nullPv, 8);
  if (!L.steps.length) return null;
  const T = COLOR_NAME[L.side];
  const s0 = L.steps[0];
  const first = prose(s0.color, s0.san);
  const showTo = L.mateIdx >= 0 ? L.mateIdx + 1 : Math.max(1, Math.min(L.keyIdx + 1, 3));
  const line = narrate(L.steps.slice(0, showTo));

  const squares = new Set([s0.from, s0.to]);
  L.steps.slice(0, (L.keyIdx || 0) + 1).forEach((s) => { if (s.color === L.side && s.captured) squares.add(s.to); });
  if (L.motif?.targets) L.motif.targets.forEach((t) => squares.add(t.square));
  if (L.motif?.pinned) squares.add(L.motif.pinned.square);
  if (L.motif?.front) squares.add(L.motif.front.square);
  if (L.motif?.target) squares.add(L.motif.target);

  // Every piece of yours that is genuinely en prise counts as a right answer, not just
  // the one the engine happened to take first.
  const mine = opp(L.side);
  const B = boardOf(fen);
  const loose = hangingPieces(B, mine);
  loose.forEach((h) => squares.add(h.square));

  // Several pieces hit by one attacker = a fork already on the board.
  let forkText = null;
  if (loose.length >= 2) {
    const byAttacker = new Map();
    for (const h of loose) for (const a of attackersOf(B, h.square, L.side)) byAttacker.set(a, [...(byAttacker.get(a) || []), h]);
    const [att, hits] = [...byAttacker.entries()].sort((x, y) => y[1].length - x[1].length)[0] || [];
    if (hits?.length >= 2) {
      squares.add(att);
      const names = hits.slice(0, 3).map((h) => `${pn(h.piece.type)} on ${h.square}`);
      forkText = `${T}’s ${pn(B.get(att).type)} on ${att} attacks your ${names.join(' and your ')} at the same time — one of them will fall unless you find something forcing.`;
    }
  }

  let text;
  if (L.mateIdx >= 0) text = `${T} threatens mate: ${line}.`;
  else if (forkText) text = forkText;
  else {
    const m = describeMotif(L.motif, L.steps);
    text = m && L.motif.type !== 'hanging'
      ? `${T} threatens ${first}: ${m.replace(first + ' ', '')}, winning ${winningsPhrase(L)}.`
      : `${T} threatens ${first}, winning ${winningsPhrase(L)}.`;
  }
  return { text, squares: [...squares], move: s0, L, gain: L.gain, mate: L.mateIdx >= 0 };
}

/** One-line description of what a quiet (non-tactical) move does. */
export function describeQuietMove(fen, uci) {
  const g = new Chess(fen);
  const before = boardOf(g);
  let r;
  try { r = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return 'a solid move'; }
  if (!r) return 'a solid move';
  const after = boardOf(g);
  const side = r.color;
  const moveNo = parseInt(fen.split(' ')[5] || '1', 10);
  const [f, rank] = coords(r.to);
  const rel = side === 'w' ? rank : 9 - rank;

  if (r.san.startsWith('O-O-O')) return 'castles queenside: the king gets safe and the rook comes to the centre';
  if (r.san.startsWith('O-O')) return 'castles: the king is safe and the rook joins the game';

  const savedPiece = hangingPieces(before, side).find((h) => h.square === r.from || !hangingPieces(after, side).some((x) => x.square === h.square));

  if (r.captured) {
    const g2 = see(before, r.to, side, r.from) ?? 0;
    let text;
    if (g2 <= 0 && VALUES[r.captured] === VALUES[r.piece]) {
      text = r.captured === r.piece ? `trades ${pn(r.piece)}s on ${r.to}` : `trades your ${pn(r.piece)} for the ${pn(r.captured)} on ${r.to}`;
    } else text = `takes the ${pn(r.captured)} on ${r.to}`;
    if (savedPiece?.square === r.from) text += ` — the ${pn(r.piece)} was under attack anyway`;
    return text;
  }

  if (savedPiece) {
    const p = before.get(savedPiece.square);
    return savedPiece.square === r.from
      ? `moves the ${pn(p.type)} out of danger to ${r.to}`
      : `protects the ${pn(p.type)} on ${savedPiece.square}, which was under attack`;
  }

  const threats = threatsBy(after, r.to).filter((t) => !t.check);
  if (threats.length) return `attacks the ${pn(threats[0].piece.type)} on ${threats[0].square}`;

  if (r.piece === 'p') {
    const passed = isPassed(after, r.to, side);
    if (passed && rel >= 5) return `pushes the passed pawn to ${r.to}`;
    if ((r.to[0] === 'd' || r.to[0] === 'e') && (rel === 4 || rel === 5)) return `claims the centre with a pawn on ${r.to}`;
    if (moveNo <= 12 && (r.to[0] === 'c' || r.to[0] === 'f')) return `supports the fight for the centre from the ${r.to[0]}-file`;
    if (rel >= 5 && kingSideOfFile(after, opp(side), f)) return `starts a pawn storm against the enemy king`;
    return pawnPurpose(before, after, r, side);
  }
  if ((r.piece === 'n' || r.piece === 'b') && moveNo <= 15) {
    const backRank = side === 'w' ? '1' : '8';
    if (r.from[1] === backRank) return `develops the ${pn(r.piece)} to ${r.to}`;
  }
  if (r.piece === 'n' && rel >= 4 && rel <= 6 && isOutpost(after, r.to, side)) return `plants the knight on ${r.to}, an outpost no pawn can chase away`;
  if (r.piece === 'r') {
    const file = r.to[0];
    let own = 0, theirs = 0;
    for (let i = 1; i <= 8; i++) { const p = after.get(file + i); if (p?.type === 'p') (p.color === side ? own++ : theirs++); }
    if (rel === 7) return 'puts the rook on the 7th rank, where it attacks pawns and boxes in the king';
    if (rel === 3 && r.from[1] === r.to[1] && kingSideOfFile(after, opp(side), f)) return 'swings the rook along the third rank toward the enemy king (a “rook lift”)';
    if (!own && !theirs) return `takes the open ${file}-file`;
    if (!own) return `puts the rook on the half-open ${file}-file, pressing against the pawn there`;
  }
  if (r.piece === 'b' && ((side === 'w' && (r.to === 'g2' || r.to === 'b2')) || (side === 'b' && (r.to === 'g7' || r.to === 'b7')))) return 'fianchettoes the bishop onto the long diagonal';
  if (r.piece === 'k' && countPieces(after) <= 12) return 'activates the king — in the endgame it’s a fighting piece';
  if (r.piece === 'q' && moveNo <= 8) return `brings the queen to ${r.to}`;
  return `improves the ${pn(r.piece)} on ${r.to}`;
}

/** What a quiet pawn move is for, in order of how much it usually matters. */
function pawnPurpose(before, after, r, side) {
  const them = opp(side);
  const Them = COLOR_NAME[them];
  const covers = attacksFrom(after, r.to);
  // 1. It supports a piece that's being attacked or challenged.
  for (const sq of covers) {
    const p = after.get(sq);
    if (!p || p.color !== side || p.type === 'p' || p.type === 'k') continue;
    const by = attackersOf(after, sq, them);
    if (!by.length) continue;
    const a = by.map((x) => ({ sq: x, p: after.get(x) })).sort((x, y) => VALUES[x.p.type] - VALUES[y.p.type])[0];
    return `supports the ${pn(p.type)} on ${sq}, which ${Them}’s ${pn(a.p.type)} on ${a.sq} is ${VALUES[a.p.type] >= VALUES[p.type] ? 'challenging' : 'attacking'}`;
  }
  // 2. It opens a line for one of your long-range pieces.
  for (const [sq, p] of after) {
    if (p.color !== side || !['b', 'q', 'r'].includes(p.type)) continue;
    // The pawn was blocking this piece's line, which now runs on through the vacated square.
    const gained = attacksFrom(after, sq).filter((x) => !attacksFrom(before, sq).includes(x));
    if (gained.length && attacksFrom(after, sq).includes(r.from)) return `opens the way for your ${pn(p.type)} on ${sq} (it can now use ${[r.from, ...gained].slice(0, 2).join(' and ')})`;
  }
  // 3. It gives the king an escape square.
  const k = [...after].find(([, p]) => p.type === 'k' && p.color === side)?.[0];
  if (k && attacksFrom(after, k).includes(r.from) && Math.abs(coords(k)[0] - coords(r.from)[0]) <= 1) {
    return `gives your king an escape square on ${r.from}${covers.length ? ` and keeps ${Them}’s pieces off ${covers.join(' and ')}` : ''}`;
  }
  // 4. It takes squares away from enemy pieces.
  const denied = covers.filter((sq) => [...after].some(([s2, p]) => p.color === them && ['n', 'b', 'q'].includes(p.type) && attacksFrom(after, s2).includes(sq) && !after.get(sq)));
  if (denied.length) return `takes ${denied.join(' and ')} away from ${Them}’s pieces`;
  return `gains space on the ${r.to[0]}-file and covers ${covers.join(' and ')}`;
}

function isPassed(B, square, side) {
  const [f, r] = coords(square);
  const dir = side === 'w' ? 1 : -1;
  for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) {
    for (const df of [-1, 0, 1]) {
      const ff = f + df;
      if (ff < 0 || ff > 7) continue;
      const p = B.get('abcdefgh'[ff] + rr);
      if (p && p.type === 'p' && p.color !== side) return false;
    }
  }
  return true;
}

function isOutpost(B, square, side) {
  const [f, r] = coords(square);
  const enemyDir = side === 'w' ? 1 : -1; // enemy pawns that could attack it sit further up the board
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff < 0 || ff > 7) continue;
    for (let rr = r + enemyDir; rr >= 1 && rr <= 8; rr += enemyDir) {
      const p = B.get('abcdefgh'[ff] + rr);
      if (p && p.type === 'p' && p.color !== side) return false;
    }
  }
  return true;
}

function kingSideOfFile(B, color, file) {
  for (const [s, p] of B) if (p.type === 'k' && p.color === color) return Math.abs(coords(s)[0] - file) <= 2;
  return false;
}

const countPieces = (B) => B.size;
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export { capitalize };
