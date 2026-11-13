// The coach's words. Everything here is derived from concrete board facts
// (attack maps, exchanges, engine lines) so explanations stay truthful.
import { Chess } from 'chess.js';
import { NAMES, VALUES, COLOR_NAME, formatLine, opp, turnOf, playLine, coords, nullMoveFen, lineText, materialBalance } from './chessutil.js';
import { analyzeLine, boardOf, hangingPieces, see, threatsBy, attackersOf, attacksFrom, motifsOfMove, pinnedBy, between } from './tactics.js';

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
  // Even trades cancel out; what's left is what was really won. A capture and the
  // recapture on the same square pair up first, then any captures of equal value.
  for (let i = ours.length - 1; i >= 0; i--) {
    const j = theirs.findIndex((x) => x.square === ours[i].square && VALUES[x.type] === VALUES[ours[i].type]);
    if (j >= 0) { theirs.splice(j, 1); ours.splice(i, 1); }
  }
  for (let i = ours.length - 1; i >= 0; i--) {
    const j = theirs.findIndex((x) => VALUES[x.type] === VALUES[ours[i].type]);
    if (j >= 0) { theirs.splice(j, 1); ours.splice(i, 1); }
  }
  // Name the square only if the piece is standing there now (not where the line moved it).
  const B0 = L.steps[0] ? boardOf(L.steps[0].fenBefore) : null;
  const one = (x) => (B0?.get(x.square)?.type === x.type ? `the ${pn(x.type)} on ${x.square}` : `a ${pn(x.type)}`);
  ours.sort((a, b) => VALUES[b.type] - VALUES[a.type]);
  const sum = (xs) => xs.reduce((n, x) => n + VALUES[x.type], 0);
  if (ours.length === 1 && theirs.length === 0) return one(ours[0]);
  if (ours.length === 1 && theirs.length === 1 && ours[0].type === 'r' && ['n', 'b'].includes(theirs[0].type)) return 'the exchange';
  // One big piece for something smaller: "the rook on g4 for a pawn".
  if (ours.length === 1 && theirs.length && theirs.every((x) => x.square === ours[0].square) && Math.abs(VALUES[ours[0].type] - sum(theirs) - L.gain) <= 1 && sum(theirs) < VALUES[ours[0].type]) {
    return `${one(ours[0])} for ${pieceList(theirs.map((x) => x.type))}`;
  }
  if (!theirs.length && ours.length >= 2 && ours.every((x) => x.type === 'p') && ours.length === L.gain) return `${COUNT[ours.length] || ours.length} pawns`;
  if (!theirs.length && ours.length >= 2 && ours.length <= 3 && Math.abs(sum(ours) - L.gain) <= 1) return joinAnd(ours.map(one));
  return materialPhrase(L.gain);
}

/** The motif as a phrase that can follow a move: "a fork of the king and the rook on e1". */
export function motifTail(m) {
  const tgt = (t) => (t.piece.type === 'k' ? 'the king' : `the ${pn(t.piece.type)} on ${t.square}`);
  switch (m?.type) {
    case 'fork': return `a fork of ${joinAnd(m.targets.map(tgt))}`;
    case 'discovered': return `uncovering an attack on the ${pn(m.piece.type)} on ${m.target}`;
    case 'discovered-check': return `a discovered check from the ${pn(m.sliderPiece.type)} on ${m.slider}`;
    case 'double-check': return 'a double check';
    case 'skewer': return `a skewer through the ${m.front.piece.type === 'k' ? 'king' : pn(m.front.piece.type)} to the ${pn(m.behind.piece.type)} on ${m.behind.square}`;
    case 'pin': return m.absolute ? `pinning the ${pn(m.pinned.piece.type)} on ${m.pinned.square} to the king` : `pinning the ${pn(m.pinned.piece.type)} on ${m.pinned.square}`;
    case 'promotion': return 'promoting the pawn';
    default: return null;
  }
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
export function explainMistake({ fen, uci, movePv, winBefore, winAfter, bestPv = null, bestScore = null }) {
  const side = turnOf(fen);
  const [mv] = playLine(fen, [uci]);
  if (!mv) return { why: '', refutation: '' };
  const reply = movePv?.slice(1) ?? [];
  const R = analyzeLine(mv.fenAfter, reply, 10);
  const r0 = R.steps[0];
  const refShowTo = R.mateIdx >= 0 ? R.mateIdx + 1 : Math.min(R.steps.length, Math.max(R.keyIdx + 1, 1));
  const refutation = r0 ? lineText(R.steps.slice(0, refShowTo)) : '';
  const yourMove = prose(mv.color, mv.san);
  const T = them(side);

  if (R.mateIdx >= 0) {
    const n = Math.floor(R.mateIdx / 2) + 1;
    return { why: `After ${yourMove}, ${T} has a forced mate${n > 1 ? ` in ${n}` : ''}.`, refutation, motif: R.motif, kind: 'mate' };
  }

  // What your move itself took counts: a trade, or winning more than you give back, isn't a loss.
  const ownGain = (mv.captured ? VALUES[mv.captured] : 0) + (mv.promotion ? VALUES[mv.promotion] - 1 : 0);
  // Where the material stands (for you) once each line settles. A move only "loses material"
  // if it comes out worse than the best move would have: when a pawn is going whatever you
  // play, losing it isn't what was wrong with this move.
  const { U, end } = settle(fen, movePv || [uci]);
  const played = U.steps.length ? U.mats[Math.max(0, end)] : 0;
  const bestEnd = bestPv?.length ? settle(fen, bestPv) : null;
  const bestNet = bestEnd?.U.steps.length ? bestEnd.U.mats[Math.max(0, bestEnd.end)] : 0;
  // A tactic is only claimed if it pays off quickly; deep in the line the moves aren't forced.
  const quick = analyzeLine(mv.fenAfter, reply, 6).gain - ownGain >= 1;
  // The king is never the "cheaper attacker": it can only take what nothing defends.
  const worth = (t) => (t === 'k' ? 100 : VALUES[t]);
  if (r0 && R.gain - ownGain >= 1 && played < bestNet) {
    const before = boardOf(fen);
    const after = boardOf(mv.fenAfter);
    const hungBefore = new Set(hangingPieces(before, side).map((h) => h.square));
    const hungAfter = hangingPieces(after, side);
    const won = winningsPhrase(R);
    // The piece you just moved can be taken for more than it took — whether the engine takes
    // it at once, or plays something else first. (If what it takes first is something the
    // move exposed, that is the story: see below.)
    const looseGain = hungAfter.find((h) => h.square === mv.to)?.gain ?? 0;
    const takenAtOnce = r0.to === mv.to && !!r0.captured;
    const newlyLoose = hungAfter.find((h) => !hungBefore.has(h.square) && h.square !== mv.to);
    const exposed = !!newlyLoose && r0.to === newlyLoose.square;

    if (looseGain > ownGain && (takenAtOnce || (quick && !exposed))) {
      const att = attackersOf(after, mv.to, opp(side)).map((x) => ({ sq: x, p: after.get(x) })).sort((x, y) => worth(x.p.type) - worth(y.p.type));
      const d = attackersOf(after, mv.to, side).length;
      const cheap = att[0];
      const mine = mv.promotion || mv.piece; // a pawn that just promoted is now that piece
      const reason = d === 0 ? 'nothing defends it'
        : cheap && worth(cheap.p.type) < worth(mine) ? `the ${pn(cheap.p.type)} on ${cheap.sq} can take it, and taking back only wins a ${pn(cheap.p.type)}`
          : att.length > d ? `it’s attacked ${times(att.length)} and defended only ${times(d)}` : null;
      if (reason) return { why: `Your ${pn(mine)} on ${mv.to} isn’t safe there — ${reason}.`, refutation, motif: { type: 'hanging' }, kind: 'hangs' };
    }
    // "Ignored the threat" only if the best move actually dealt with it — by moving or
    // guarding the piece, or by selling it for at least its worth.
    const bestKept = (() => {
      const [b0] = bestPv?.length ? playLine(fen, [bestPv[0]]) : [];
      if (!b0) return true;
      if (b0.from === r0.to && b0.captured && VALUES[b0.captured] >= VALUES[b0.piece]) return true;
      return !hangingPieces(boardOf(b0.fenAfter), side).some((h) => h.square === (b0.from === r0.to ? b0.to : r0.to));
    })();
    // A named tactic on their first or second move (a fork, a pin…) that the line cashes in is
    // concrete enough to claim even when the 6-ply count is cut off mid-exchange.
    const named = R.motif && ['fork', 'pin', 'skewer', 'discovered', 'discovered-check', 'double-check'].includes(R.motif.type) && (R.motif.ply ?? 0) <= 2;
    // (If taking the attacked piece is itself a fork that wins far more, the fork is the story.)
    const bigger = named && (R.motif.ply ?? 0) === 0 && r0.captured && R.gain - ownGain >= VALUES[r0.captured] + 2;
    if (r0.captured && hungBefore.has(r0.to) && r0.to !== mv.from && bestKept && !bigger) {
      const victim = after.get(r0.to);
      const att = attackersOf(after, r0.to, opp(side)).map((x) => ({ sq: x, p: after.get(x) })).sort((x, y) => worth(x.p.type) - worth(y.p.type));
      const defsAll = attackersOf(after, r0.to, side);
      const pinned = defsAll.filter((d) => pinnedBy(after, d, opp(side)));
      const defs = defsAll.length - pinned.length;
      const cheap = att[0];
      const how = !defsAll.length ? 'and nothing defends it'
        : !defs ? `and its defender on ${pinned[0]} is pinned`
          : cheap && worth(cheap.p.type) < worth(victim.type) ? `by the ${pn(cheap.p.type)} on ${cheap.sq} — defending it doesn’t help against a cheaper attacker; it needed to move`
            : att.length > defs ? 'and it’s still attacked more times than it’s defended' : null;
      if (how) return { why: `This ignores the threat: your ${pn(r0.captured)} on ${r0.to} was already under attack${how.startsWith('by') ? ' ' : ', '}${how}.`, refutation, motif: { type: 'hanging' }, kind: 'ignored-threat' };
    }
    if (exposed) {
      // Did the move open a line onto it, or take away a defender?
      const opener = attackersOf(after, newlyLoose.square, opp(side)).find((a) => ['b', 'r', 'q'].includes(after.get(a).type) && between(a, newlyLoose.square).includes(mv.from));
      const why = opener
        ? `Moving the ${pn(mv.piece)} opened the line from ${T}’s ${pn(after.get(opener).type)} on ${opener} to your ${pn(newlyLoose.piece.type)} on ${newlyLoose.square}.`
        : `Moving the ${pn(mv.piece)} left your ${pn(newlyLoose.piece.type)} on ${newlyLoose.square} without enough protection.`;
      return { why, refutation, motif: { type: 'hanging' }, kind: 'removed-defender' };
    }
    if (quick || named) {
      const ms = R.motif && R.steps[R.motif.ply ?? 0];
      // A capture several moves in ("takes the queen, which was undefended") is usually just the
      // end of an exchange — describing it as the tactic misleads. Name only what starts the line.
      const lead = R.motif?.type === 'hanging' && (R.motif.ply ?? 0) > 0 ? null : R.motif;
      const m = describeMotif(lead, R.steps, ms ? lineText([ms]) : undefined);
      // "…takes the pawn on e5, which was undefended" already says what is won.
      const said = lead?.type === 'hanging' && won === `the ${pn(lead.piece)} on ${lead.square}`;
      return {
        // (Name what is won only if it matches where the line settles; the longer line can differ.)
        why: m ? `It walks into a tactic: ${m}${said ? '' : `, and ${T} wins ${won}`}.` : `${T} has a forcing sequence that wins ${Math.abs(R.gain - ownGain + played) <= 1 ? won : 'material'}.`,
        refutation, motif: R.motif, kind: 'tactic',
      };
    }
  }

  // Was there something concrete to win instead? That's the real lesson, ahead of nuances.
  const B = bestPv?.length ? analyzeLine(fen, bestPv, Math.min(24, bestPv.length)) : null;
  if ((B && B.mateIdx >= 0) || (bestScore?.type === 'mate' && bestScore.value > 0)) {
    return { why: 'It misses a forced mate. Look at every check.', refutation, motif: { type: 'mate' }, kind: 'missed-win' };
  }
  // It does lose material, in a way none of the patterns above describes: say so, with the line.
  if (played <= -1 && played < bestNet && end >= 1) {
    const outcome = balance(U.steps.slice(0, end + 1), side, played, materialBalance(fen, side));
    return { why: `It loses material: after ${lineText(U.steps.slice(1, end + 1))}, ${outcome}.`, refutation: '', motif: null, kind: 'material' };
  }
  const cap = B?.steps.slice(0, B.keyIdx + 1).find((s) => s.color === side && s.captured);
  if (B && B.gain >= 1 && B.gain - Math.max(0, played) >= 1 && cap) {
    const here = boardOf(fen).get(cap.to)?.type === cap.captured;
    // (Mid-trade, taking the piece is "taking back", not winning it.)
    const retake = mv.captured && VALUES[mv.captured] >= 3 && materialBalance(fen, side) <= -(VALUES[mv.captured] - 1);
    const why = here && mv.captured && cap.to === mv.to
      ? `There was a better way to ${retake ? 'take back' : 'win'} the ${pn(cap.captured)} on ${cap.to}, without giving material back.`
      : `It misses a chance to win material${here ? ` — look at ${T}’s ${pn(cap.captured)} on ${cap.to}` : ''}.`;
    return {
      why,
      refutation, motif: B.motif, kind: 'missed-win',
    };
  }
  const evals = `the evaluation goes from ${evalText(winBefore, side)} to ${evalText(winAfter, side)}`;
  // Material was going whatever you played (the best move gives up as much): not this move's fault.
  const anyway = played <= -1 && played >= bestNet;
  const lead = anyway ? 'You were losing material whatever you played here, but this makes it worse' : 'It doesn’t lose material, but';
  // Only costs the best move would have avoided are reasons this move was worse.
  const bestAt = bestEnd && bestEnd.end >= 1 ? bestEnd.U.steps[bestEnd.end] : null;
  const shared = new Set(bestAt ? positionalReasons(fen, bestAt.fenAfter, side) : []);
  const costs = (end >= 1 && U.steps[end] ? positionalReasons(fen, U.steps[end].fenAfter, side) : []).filter((c) => !shared.has(c));
  if (costs.length && end >= 1) {
    return {
      why: `${lead}${anyway ? ':' : ''} after ${lineText(U.steps.slice(1, end + 1))}, ${joinAnd(costs)} (${evals}).`,
      refutation: '', motif: null, kind: 'positional',
    };
  }
  const cost = winAfter >= 0.6 ? 'it lets much of your advantage slip'
    : winAfter >= 0.4 && winBefore >= 0.6 ? `it lets ${T} back into the game`
      : winAfter >= 0.4 && winBefore >= 0.55 ? 'it gives up your edge'
        : `it gives ${T} the easier game`;
  return {
    why: anyway ? `${lead}: ${evals}.` : `${lead} ${cost}: ${evals}.`,
    refutation, motif: null, kind: 'positional',
  };
}

const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/**
 * Expected score for `side` → "+0.4" / "−1.3" in pawns (inverse of the logistic model),
 * always from White's point of view like the evaluation bar.
 */
function evalText(w, side = 'w') {
  const c = Math.min(0.999, Math.max(0.001, w));
  const pawns = (side === 'w' ? 1 : -1) * Math.log(c / (1 - c)) / 0.00368208 / 100;
  if (Math.abs(pawns) < 0.05) return '0.0';
  return (pawns > 0 ? '+' : '−') + Math.abs(pawns).toFixed(1);
}

function pawnFiles(B, color) {
  const files = {};
  for (const [s, p] of B) if (p.type === 'p' && p.color === color) files[s[0]] = (files[s[0]] || 0) + 1;
  return files;
}
const FILE_ORDER = 'abcdefgh';

/**
 * Concrete positional costs of going from fen0 to fen1, for `me`: doubled or isolated
 * pawns, losing the bishop pair, a stripped king, an enemy passed pawn.
 */
export function positionalReasons(fen0, fen1, me) {
  const B0 = boardOf(fen0), B1 = boardOf(fen1);
  const them = opp(me), Them = COLOR_NAME[them];
  const out = [];
  const f0 = pawnFiles(B0, me), f1 = pawnFiles(B1, me);
  const doubled = Object.keys(f1).filter((f) => f1[f] >= 2 && !(f0[f] >= 2));
  if (doubled.length) out.push(`your pawns end up doubled on the ${doubled[0]}-file`);
  const isolated = (files) => Object.keys(files).filter((f) => {
    const i = FILE_ORDER.indexOf(f);
    return !files[FILE_ORDER[i - 1]] && !files[FILE_ORDER[i + 1]];
  });
  const iso = isolated(f1).filter((f) => !isolated(f0).includes(f));
  if (iso.length) out.push(`you’re left with an isolated pawn on the ${iso[0]}-file`);
  const bishops = (B, c) => [...B.values()].filter((p) => p.type === 'b' && p.color === c).length;
  if (bishops(B0, me) >= 2 && bishops(B1, me) < 2 && bishops(B1, them) >= 2) out.push(`${Them} gets the bishop pair`);
  const shelter = (B) => {
    const k = [...B].find(([, p]) => p.type === 'k' && p.color === me)?.[0];
    if (!k) return 0;
    const [kf, kr] = coords(k);
    const dir = me === 'w' ? 1 : -1;
    let n = 0;
    for (let df = -1; df <= 1; df++) for (const dr of [1, 2]) {
      const p = B.get(FILE_ORDER[kf + df] + (kr + dr * dir));
      if (p?.type === 'p' && p.color === me) n++;
    }
    return n;
  };
  // (Only comparable if the king is on the same square in both positions.)
  const kingAt = (B) => [...B].find(([, p]) => p.type === 'k' && p.color === me)?.[0];
  if (kingAt(B0) === kingAt(B1) && shelter(B1) <= shelter(B0) - 2) out.push('your king loses most of its pawn cover');
  const passedFiles = (B) => [...B].filter(([s2, p]) => p.type === 'p' && p.color === them && isPassed(B, s2, them)).map(([s2]) => s2[0]);
  const newPassed = passedFiles(B1).filter((f) => !passedFiles(B0).includes(f));
  if (newPassed.length) out.push(`${Them} gets a passed pawn on the ${newPassed[0]}-file`);
  return out;
}

export const joinAnd = (xs) => (xs.length <= 1 ? xs[0] || '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Where a line "settles": the first quiet point after which material stops changing. */
export function settle(fen, pv) {
  const U = analyzeLine(fen, pv, 14);
  // A check isn't a resting point: the combination usually goes on.
  const settled = U.stables.filter((i) => i >= 1 && i <= 11 && !U.steps[i].check);
  if (!settled.length) return { U, end: Math.min(1, U.steps.length - 1) };
  // Stop at the first quiet point; keep following if a piece-sized swing comes later (e.g.
  // winning the knight back), or a pawn soon after — not for stray pawn grabs deep in the line.
  // A swing only counts if it lasts: an in-between move before the recapture can make a line
  // look settled for a moment when it isn't.
  const lasting = (i, up) => {
    const near = U.stables.filter((j) => j >= i && j <= i + 4);
    const v = (up ? Math.min : Math.max)(...near.map((j) => U.mats[j]));
    return { v, at: near.find((j) => U.mats[j] === v) };
  };
  let end = settled[0];
  for (const i of settled) {
    if (i <= end || U.mats[i] === U.mats[end]) continue;
    const { v, at } = lasting(i, U.mats[i] > U.mats[end]);
    const swing = Math.abs(v - U.mats[end]);
    if (swing >= 2 || (swing >= 1 && i <= 5)) end = at;
  }
  return { U, end };
}

/**
 * What the move just played runs into, following the engine's line after it: the
 * opponent's reply and why it works, where the material settles, and — when a capture
 * turns out not to win anything — that it "wasn't really free".
 * Returns { text, summary } or null. Written for the player who made the move ("you").
 */
export function explainConsequence({ fen, movePv, winAfter }) {
  const { U, end } = settle(fen, movePv);
  const st = U.steps;
  if (st.length < 2 || end < 1) return null;
  const me = U.side;
  const Them = COLOR_NAME[opp(me)];
  const g0 = U.mats[0];
  const net = U.mats[end];
  const r1 = st[1];
  const num = (s) => formatLine(s.fenBefore, [s.san]);
  // If the line ends with you mated, that is the whole story — not the pawn count on the way.
  if (U.matedIdx >= 1) {
    const line = lineText(st.slice(1, U.matedIdx + 1));
    const n = Math.ceil(U.matedIdx / 2);
    const text = n === 1 ? `${Them} answers ${num(r1).replace('#', '')} — checkmate.` : `${Them} answers ${num(r1)}, and it’s mate in ${n}: ${line}.`;
    return { text, summary: line, net: -99, g0, costs: [], telling: true, mate: true };
  }

  let reply = `${Them} answers ${num(r1)}`;
  if (r1.captured) {
    const B = boardOf(r1.fenBefore);
    const def = attackersOf(B, r1.to, me).length;
    const att = attackersOf(B, r1.to, opp(me)).length;
    reply += `, taking the ${pn(r1.captured)} on ${r1.to}`;
    if (def === 0) reply += ' — nothing defends it';
    else if (VALUES[r1.piece] < VALUES[r1.captured]) reply += ` with the ${pn(r1.piece)}`;
    else if (att > def && (see(B, r1.to, opp(me), r1.from) ?? 0) > 0) reply += ` — it’s attacked ${times(att)} and defended only ${times(def)}`;
  } else {
    const hits = threatsBy(boardOf(r1.fenAfter), r1.to).filter((x) => !x.check);
    if (hits.length) reply += `, attacking your ${hits.slice(0, 2).map((x) => `${pn(x.piece.type)} on ${x.square}`).join(' and ')}`;
  }
  // Taking back in the middle of a trade isn't winning the piece: count from after the recapture.
  const before = materialBalance(fen, me);
  const v0 = st[0].captured ? VALUES[st[0].captured] : 0;
  const retake = v0 >= 3 && before <= -(v0 - 1);
  const outcome = retake ? balance(st.slice(1, end + 1), me, net - v0, before + v0) : balance(st.slice(0, end + 1), me, net, before);
  const notFree = !retake && g0 > 0 && net >= 0 && net < g0 && st[0].captured ? ` — the ${pn(st[0].captured)} wasn’t really free` : '';
  const n = retake ? net - v0 : net; // what the line costs or wins, beyond taking back
  const n0 = retake ? 0 : g0;
  const sentences = [`${reply}.`];
  if (end >= 2) sentences.push(`After ${lineText(st.slice(2, end + 1))}, ${outcome}${notFree}.`);
  else if (n !== n0 || n < 0) sentences.push(`${capitalize(outcome)}${notFree}.`);
  const costs = n >= 0 ? positionalReasons(fen, st[end].fenAfter, me) : [];
  if (costs.length) sentences.push(`But ${joinAnd(costs)}.`);
  else if (n >= 0 && winAfter < 0.42) sentences.push(n > 0 ? `But ${Them} still has the better position.` : `${Them} gets the more comfortable position.`);
  const summary = `${lineText(st.slice(1, end + 1))}: ${outcome}${costs.length ? `, but ${joinAnd(costs)}` : ''}`;
  return { text: sentences.join(' '), summary, net: n, g0: n0, costs, telling: n < 0 || n < n0 || costs.length > 0 }; // (coming out ahead isn't a reason a move was worse)
}

const COUNT = ['', 'a', 'two', 'three', 'four', 'five'];
function pieceList(types) {
  const order = ['q', 'r', 'b', 'n', 'p'];
  const n = {};
  types.forEach((t) => { n[t] = (n[t] || 0) + 1; });
  const parts = order.filter((t) => n[t]).map((t) => (n[t] === 1 ? `${t === 'q' ? 'the' : 'a'} ${pn(t)}` : `${COUNT[n[t]] || n[t]} ${pn(t)}s`));
  return parts.length <= 1 ? parts[0] || '' : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * What the line did to the material: "you’ve lost a knight", "you’ve given a knight for a
 * pawn", "it comes out even". `before` is the balance before the line (for "level").
 */
function balance(steps, me, net, before = 0) {
  if (net === 0) return before === 0 ? 'material is level' : 'the material comes out even';
  // A pawn that queens moves the count more than any capture, and a list of what was taken
  // would mislead (the "queen" you won may have been that pawn): give the bottom line.
  const promo = steps.find((s) => s.promotion);
  if (promo) {
    const whose = promo.color === me ? 'your' : `${COLOR_NAME[opp(me)]}’s`;
    return `${whose} pawn promotes and you come out ${materialPhrase(Math.abs(net))} ${net > 0 ? 'ahead' : 'down'}`;
  }
  const got = [], gave = [];
  for (const s of steps) if (s.captured) (s.color === me ? got : gave).push(s.captured);
  for (let i = got.length - 1; i >= 0; i--) {
    const j = gave.indexOf(got[i]);
    if (j >= 0) { gave.splice(j, 1); got.splice(i, 1); }
  }
  if (got.length && gave.length) {
    const mine = pieceList(gave).replace(/^the /, 'your ');
    return net > 0 ? `you’ve won ${pieceList(got)} for ${mine}` : `you’ve given ${mine} for ${pieceList(got)}`;
  }
  const level = before + net === 0 ? ' — material is level now' : '';
  if (gave.length) return `you’ve lost ${pieceList(gave).replace(/^the /, 'your ')}${level}`;
  if (got.length) return `you’ve won ${pieceList(got)}${level}`;
  return net > 0 ? `you’ve won ${materialPhrase(net)}${level}` : `you’ve lost ${materialPhrase(-net)}${level}`;
}

/** "What is the opponent threatening?" — from a null-move search. */
export function explainThreat(fen, nullPv) {
  const nf = nullMoveFen(fen);
  if (!nf || !nullPv?.length) return null;
  const deep = analyzeLine(nf, nullPv, 8);
  if (!deep.steps.length) return null;
  // A mate threat can run deep. Anything else is judged on what it wins right away (their
  // move, your reply, their follow-up): the rest of a "what if you passed" line is one
  // possible continuation, not something they are threatening.
  const L = deep.mateIdx >= 0 ? deep : analyzeLine(nf, nullPv, 4);
  const T = COLOR_NAME[L.side];
  const s0 = L.steps[0];
  const first = prose(s0.color, s0.san);
  // "If you passed" lines are hypothetical, so their moves are written without numbers.
  const line = L.steps.slice(0, L.mateIdx + 1).map((s) => prose(s.color, s.san)).join(' ');

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
    for (const h of loose) {
      for (const a of attackersOf(B, h.square, L.side)) {
        if ((see(B, h.square, L.side, a) ?? 0) > 0) byAttacker.set(a, [...(byAttacker.get(a) || []), h]); // this attacker itself wins it
      }
    }
    const [att, hits] = [...byAttacker.entries()].sort((x, y) => y[1].length - x[1].length)[0] || [];
    // Two loose pawns are only "the threat" if the engine's line actually goes after them.
    if (hits?.length >= 2 && (s0.from === att || hits.some((h) => h.piece.type !== 'p'))) {
      squares.add(att);
      const names = hits.slice(0, 3).map((h) => `${pn(h.piece.type)} on ${h.square}`);
      forkText = `${T}’s ${pn(B.get(att).type)} on ${att} attacks your ${joinAnd(names)} at the same time. Can you save both?`;
    }
  }

  // A piece of yours that simply hangs is the threat to name — even if the engine's line
  // plays a fancier in-between move first (e.g. a check before taking the queen).
  let direct = null;
  const top = loose[0];
  // (Checked against the whole line: the engine may play an in-between move before taking.)
  if (top && top.gain >= 2 && L.mateIdx < 0 && !forkText && deep.gain <= top.gain + 1) {
    const att = attackersOf(B, top.square, L.side).sort((a, b) => VALUES[B.get(a).type] - VALUES[B.get(b).type])[0];
    const mv = att && new Chess(nf).moves({ verbose: true }).find((m) => m.from === att && m.to === top.square);
    if (mv) {
      const cap = pn(B.get(att).type), vic = pn(top.piece.type);
      const defenders = attackersOf(B, top.square, mine).sort((a, b) => VALUES[B.get(a).type] - VALUES[B.get(b).type]);
      const defended = defenders.length > 0 && top.gain < VALUES[top.piece.type];
      // "Outright" only if nothing comes back: no recapture, and nothing of theirs hanging to you.
      const theirLoose = hangingPieces(B, L.side).length > 0;
      const how = defended && VALUES[B.get(att).type] >= VALUES[top.piece.type] ? 'win material — you can’t take back without losing more'
        : defended ? `cost you the ${vic} for a ${cap}`
        : defenders.length ? `win it — your ${pn(B.get(defenders[0]).type)} on ${defenders[0]} can’t safely take back`
          : theirLoose || deep.gain < top.gain - 1 ? 'win it' : 'win it outright';
      direct = {
        text: `${T}’s ${cap} on ${att} attacks your ${vic} on ${top.square} — ${prose(mv.color, mv.san)} would ${how}.`,
        move: { from: att, to: top.square, san: mv.san, color: mv.color, captured: top.piece.type },
        // What the engine's line shows matters too: something may come back elsewhere.
        gain: deep.steps.length >= 3 ? Math.min(top.gain, Math.max(deep.gain, 0) + 1) : top.gain,
      };
      squares.add(att);
    }
  }

  let text;
  let shownGain = L.gain; // what the text claims is won
  if (L.mateIdx >= 0) text = `${T} threatens mate: ${line}.`;
  else if (forkText) text = forkText;
  else if (direct) text = direct.text;
  else if (L.gain < 1) return null; // nothing to warn about
  else {
    let m = L.motif && !['hanging', 'material', 'check'].includes(L.motif.type) ? L.motif : null;
    // A tactic in the threatening move itself (a discovered attack, a fork) explains the haul
    // even when the line cashes in another way — you giving up the queen rather than losing it.
    if (!m) {
      const m0 = motifsOfMove(nf, s0.uci).find((x) => ['discovered', 'discovered-check', 'double-check', 'fork'].includes(x.type));
      if (m0) m = { ...m0, ply: 0 };
    }
    const tail = m ? motifTail(m) : null;
    const later = m && m.ply > 0 && L.steps[m.ply] ? prose(L.steps[m.ply].color, L.steps[m.ply].san) : null;
    // Say what the first move takes, and the next capture if it's part of the haul.
    const caps = L.steps.slice(0, L.keyIdx + 1).filter((s) => s.color === L.side && s.captured);
    const won = winningsPhrase(L);
    const capName = s0.captured ? `the ${pn(s0.captured)} on ${s0.to}` : null;
    // ("winning the rook on g4 for a pawn" already names what is taken.)
    // What the capture wins on the spot, by the count of attackers and defenders.
    const immediate = s0.captured ? Math.max(0, see(boardOf(nf), s0.to, L.side, s0.from) ?? 0) : 0;
    const swap = s0.captured && immediate > 0 && immediate < VALUES[s0.captured] ? ` for the ${pn(s0.piece)}` : '';
    const takes = capName && !won.startsWith(`${capName} for `) ? `, taking your ${pn(s0.captured)} on ${s0.to}${swap}` : '';
    // A second capture only if that piece stands there now, and you don't take anything in between.
    const i1 = caps[1] ? L.steps.indexOf(caps[1]) : -1;
    // …and only if the first capture can't simply be taken back.
    const unanswered = s0.captured && (see(boardOf(nf), s0.to, L.side, s0.from) ?? 0) >= VALUES[s0.captured];
    const clean = unanswered && i1 > 0 && B.get(caps[1].to)?.type === caps[1].captured && !L.steps.slice(1, i1).some((s) => s.captured && s.color !== L.side);
    const next = s0.captured && clean && !later ? ` — and then ${prose(caps[1].color, caps[1].san)} takes the ${pn(caps[1].captured)} on ${caps[1].to} too` : '';
    // A plain capture threatens at most what it takes (plus a clean second capture). Anything
    // more in the line without a tactic to explain it — you sacrificing back, say — isn't
    // their threat. (Whether taking back works is checked separately, with the engine.)
    // (And if a four-move look stops mid-combination and shows less than the capture wins, the
    // capture is still what they threaten.)
    const plain = s0.captured && !m ? VALUES[s0.captured] + (next ? VALUES[caps[1].captured] : 0) : null;
    const capped = plain !== null && (L.gain > plain || L.gain < immediate);
    if (capped) shownGain = L.gain > plain ? plain : immediate;
    const winning = (capName && won === capName) || next || capped ? '' : `winning ${won}`;
    const lead = `${T} threatens ${first}${takes}${later ? ` and then ${later}` : ''}`;
    if (tail) text = `${lead} — ${tail}${winning ? ` — ${winning}` : ''}.`;
    else text = `${lead}${next}${winning ? `, ${winning}` : ''}.`;
  }
  return { text, squares: [...squares], move: direct?.move || s0, L, gain: direct ? Math.max(direct.gain, deep.gain) : shownGain, mate: L.mateIdx >= 0 };
}

/**
 * A threatened capture that looks like it can simply be taken back: the recapture whose
 * failure the threat relies on (so the coach can say why it fails). Null if there is none.
 */
export function naiveRecapture(fen, th) {
  const s0 = th?.L?.steps[0];
  if (!s0?.captured || s0.check || th.mate) return null;
  if (th.move.from !== s0.from || th.move.to !== s0.to) return null; // the text names a different (loose) piece
  const nf = nullMoveFen(fen);
  if ((see(boardOf(nf), s0.to, s0.color, s0.from) ?? 0) > 0) return null; // it simply wins
  const B = boardOf(s0.fenAfter);
  const def = attackersOf(B, s0.to, opp(s0.color)).sort((a, b) => VALUES[B.get(a).type] - VALUES[B.get(b).type])[0];
  if (!def) return null;
  const g = new Chess(s0.fenAfter);
  let mv = null;
  try { mv = g.move({ from: def, to: s0.to, promotion: 'q' }); } catch { return null; }
  return mv ? { fen: g.fen(), san: mv.san, color: mv.color } : null;
}

/** Why the natural recapture fails, from the engine's best line after it. */
export function recaptureNote(rc, pv) {
  const L = analyzeLine(rc.fen, pv, 6);
  const r0 = L.steps[0];
  if (!r0) return null;
  // Hypothetical lines (the threat assumes you pass), so moves are named without numbers.
  const take = `Taking back with ${prose(rc.color, rc.san)}`;
  if (L.mateIdx >= 0) return `${take} runs into mate, starting with ${prose(r0.color, r0.san)}.`;
  if (L.gain < 1) return null;
  const m = motifsOfMove(r0.fenBefore, r0.uci).find((x) => !['check', 'hanging'].includes(x.type));
  const tail = m ? motifTail(m) : null;
  return `${take} runs into ${prose(r0.color, r0.san)}, ${tail || `winning ${winningsPhrase(L)}`}.`;
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

  // Checks first: answering one, or giving one.
  if (new Chess(fen).inCheck() && !r.captured) {
    return r.piece === 'k' ? `steps the king out of check to ${r.to}` : `blocks the check with the ${pn(r.piece)} on ${r.to}`;
  }
  if (g.inCheck() && !r.captured) {
    const hits = threatsBy(after, r.to).filter((t) => !t.check);
    return hits.length ? `gives check and attacks the ${pn(hits[0].piece.type)} on ${hits[0].square}` : 'gives check';
  }

  let savedPiece = hangingPieces(before, side).find((h) => h.square === r.from || !hangingPieces(after, side).some((x) => x.square === h.square));
  // Moving a loose piece to another square where it can be won isn't saving it.
  if (savedPiece?.square === r.from && (see(after, r.to, opp(side)) ?? 0) > 0) savedPiece = null;

  if (r.captured) {
    const g2 = see(before, r.to, side, r.from) ?? 0;
    let text;
    if (g2 <= 0 && VALUES[r.captured] === VALUES[r.piece]) {
      text = r.captured === r.piece ? `trades ${pn(r.piece)}s on ${r.to}` : `trades your ${pn(r.piece)} for the ${pn(r.captured)} on ${r.to}`;
    } else text = `takes the ${pn(r.captured)} on ${r.to}`;
    if (savedPiece?.square === r.from) text += ` — the ${pn(r.piece)} was under attack anyway`;
    if (new Chess(fen).inCheck()) text += ', getting out of check';
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
    if (passed && rel >= 5) return isPassed(before, r.from, side) ? `pushes the passed pawn to ${r.to}` : `pushes the pawn to ${r.to}, where it becomes a passed pawn`;
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
  if (r.piece === 'r' && r.from[0] !== r.to[0]) {
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
  return pieceRole(before, after, r, side);
}

/** What a quiet piece move does from its new square: what it aims at, protects, or opens up. */
function pieceRole(before, after, r, side) {
  const name = pn(r.piece);
  const reach = attacksFrom(after, r.to);
  // Only a real target: something it could win, not a well-defended pawn.
  const targets = reach.map((s) => ({ s, p: after.get(s) }))
    .filter((x) => x.p && x.p.color !== side && x.p.type !== 'k' && (see(after, x.s, side, r.to) ?? 0) > 0)
    .sort((a, b) => VALUES[b.p.type] - VALUES[a.p.type]);
  if (targets.length) return `puts the ${name} on ${r.to}, aiming at the ${pn(targets[0].p.type)} on ${targets[0].s}`;
  const guardedBefore = new Set(attacksFrom(before, r.from));
  const guards = reach.map((s) => ({ s, p: after.get(s) }))
    .filter((x) => x.p && x.p.color === side && x.p.type !== 'k' && !guardedBefore.has(x.s) && attackersOf(after, x.s, opp(side)).length)
    .sort((a, b) => VALUES[b.p.type] - VALUES[a.p.type]);
  if (guards.length) return `puts the ${name} on ${r.to}, where it protects the ${pn(guards[0].p.type)} on ${guards[0].s}`;
  const was = attacksFrom(before, r.from).length;
  if (reach.length >= was + 3) return `moves the ${name} to ${r.to}, where it controls ${reach.length} squares instead of ${was}`;
  return r.piece === 'k' ? `steps the king to ${r.to}` : `regroups the ${name} to ${r.to}`;
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
    // The pawn was blocking this piece's line, which now runs on through the vacated square
    // to at least one more square it can use (not just the pawn's own new square).
    const gained = attacksFrom(after, sq).filter((x) => !attacksFrom(before, sq).includes(x) && after.get(x)?.color !== side);
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
