// "What's the idea?" — explains a move the way a coach would: what it threatens and why
// that threat works, how the opponent should answer, and why the follow-up then wins.
// Also builds the hint ladder (target → piece → move + idea) from the same analysis.
import { analyzeLine, boardOf, attackersOf, pinnedBy, motifsOfMove, see } from './tactics.js';
import { Chess } from 'chess.js';
import { nullMoveFen, formatLine, NAMES, COLOR_NAME, opp, playLine, lineText } from './chessutil.js';
import { describeMotif, describeQuietMove, winningsPhrase, capitalize, explainThreat, MOTIFS, prose, motifTail } from './explain.js';

const pn = (t) => NAMES[t];
const num = (st) => formatLine(st.fenBefore, [st.san]); // "12.Rg3" / "12...Kh7"
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const SHOWN_MOTIFS = ['fork', 'pin', 'skewer', 'discovered', 'discovered-check', 'double-check', 'promotion'];

/**
 * Analyse the idea behind `pv` (best line from `fen`). With an engine, also finds what the
 * first move threatens (a null-move search: "what if they ignored it?") and, optionally,
 * what the opponent threatens right now.
 */
export async function planOf(engine, fen, pv, { opponentThreat = false } = {}) {
  const L = analyzeLine(fen, pv, 12);
  const plan = { fen, L, threat: null, oppThreat: null };
  const s0 = L.steps[0];
  if (!engine || !s0) return plan;
  // What does the move threaten? Not asked for captures: the natural reply is to take back.
  if (!s0.check && !s0.mate && !s0.captured && L.mateIdx !== 0) {
    const nf = nullMoveFen(s0.fenAfter);
    const res = nf ? await engine.analyze(nf, { depth: 10, movetime: 800 }) : null;
    if (res?.lines[0]) {
      const T = analyzeLine(nf, res.lines[0].pv, 8);
      // Only direct threats (a capture or mate next move) — "threatens Rg3, then…" teaches nothing —
      // and only ones the move itself creates: a capture that was already on before isn't its threat.
      if ((T.mateIdx >= 0 || (T.gain >= 1 && T.steps[0]?.captured)) && createdBy(fen, T)) plan.threat = T;
    }
  }
  if (opponentThreat) {
    const nf = nullMoveFen(fen);
    const res = nf ? await engine.analyze(nf, { depth: 10, movetime: 800 }) : null;
    const th = res?.lines[0] ? explainThreat(fen, res.lines[0].pv) : null;
    if (th && (th.mate || th.gain >= 2)) plan.oppThreat = th;
  }
  return plan;
}

/** Was the threat's first move already available (and already winning) before our move? */
function createdBy(fen, threat) {
  const t0 = threat.steps[0];
  if (!t0) return false;
  let before = null;
  try { before = new Chess(fen).move({ from: t0.from, to: t0.to, promotion: t0.promotion || undefined }); } catch { before = null; }
  if (!before) return true; // wasn't even legal: the move made it possible
  if (threat.mateIdx >= 0) return !before.san.includes('#');
  if (!before.captured) return true;
  return (see(boardOf(fen), t0.to, threat.side, t0.from) ?? 0) <= 0; // it used to lose material
}

/** After our move, can the opponent still make the capture they were threatening? */
function threatPersists(fenAfter, tm) {
  if (!tm?.from || !tm.to) return false;
  let r = null;
  try { r = new Chess(fenAfter).move({ from: tm.from, to: tm.to, promotion: 'q' }); } catch { r = null; }
  if (!r || !r.captured) return false;
  return (see(boardOf(fenAfter), tm.to, r.color, tm.from) ?? 0) > 0;
}

/** Synchronous plan without engine extras (no threat search). */
export const planSync = (fen, pv) => ({ fen, L: analyzeLine(fen, pv, 12), threat: null, oppThreat: null });

/** Why capturing on step `idx` works: defenders that left or were removed, pins, and the count. */
function captureReasons(fen, L, idx) {
  const S = L.steps[idx];
  if (!S.captured) return [];
  const sq = S.to;
  const us = L.side, them = opp(us);
  const B0 = boardOf(fen);
  const Bn = boardOf(S.fenBefore);
  const def0 = attackersOf(B0, sq, them);
  const defN = attackersOf(Bn, sq, them);
  const attN = attackersOf(Bn, sq, us);
  const reasons = [];
  for (const d of def0) {
    if (defN.includes(d)) continue;
    const j = L.steps.findIndex((s, k) => k < idx && (s.from === d || (s.to === d && s.captured)));
    if (j < 0) continue;
    const s = L.steps[j];
    if (s.from === d && s.to === sq) continue; // that piece moved onto the square — it's what gets taken
    const who = pn(B0.get(d).type);
    reasons.push(s.from === d ? `after ${num(s)} the ${who} no longer guards ${sq}` : `${num(s)} removes the ${who} that guarded ${sq}`);
  }
  const pinned = defN.filter((d) => pinnedBy(Bn, d, us));
  pinned.forEach((d) => reasons.push(`the ${pn(Bn.get(d).type)} on ${d} is pinned to its king and can’t take back`));
  const live = defN.length - pinned.length;
  let count = null;
  if (live === 0) count = pinned.length ? `nothing else defends ${sq}` : `nothing defends ${sq}`;
  else if (attN.length > live) count = `${sq} is attacked ${times(attN.length)} and defended only ${times(live)}`;
  const all = [...reasons, count].filter(Boolean);
  all.caused = reasons.length > 0; // the line itself took a defender away (vs. it was always loose)
  return all;
}

/** If the threat's capture couldn't be answered by recapturing because the defender is pinned. */
function pinNote(threat) {
  const t0 = threat.steps[0];
  if (!t0?.captured) return null;
  const B1 = boardOf(t0.fenAfter);
  for (const d of attackersOf(B1, t0.to, opp(threat.side))) {
    const pinner = pinnedBy(B1, d, threat.side);
    if (pinner) return { defender: d, piece: B1.get(d).type, pinner, pinnerPiece: B1.get(pinner).type };
  }
  return null;
}

function threatClause(threat) {
  const t0 = threat.steps[0];
  if (threat.mateIdx >= 0) {
    const line = threat.steps.slice(0, threat.mateIdx + 1).map((s) => s.san).join(' ');
    return `threatens mate (${line})`;
  }
  let clause = `threatens ${t0.san}, winning ${winningsPhrase(threat)}`;
  const pin = pinNote(threat);
  if (pin) return `${clause} — the ${pn(pin.piece)} on ${pin.defender} couldn’t take back, because your ${pn(pin.pinnerPiece)} on ${pin.pinner} would pin it to the king`;
  const m = threat.motif?.ply === 0 && SHOWN_MOTIFS.includes(threat.motif.type) ? threat.motif : null;
  const tail = m ? motifTail(m) : null;
  if (tail) clause += ` (${tail})`;
  return clause;
}

/**
 * Plain-English explanation of the plan. `userMove` (uci) adds a sentence contrasting it
 * with the move actually played, when the played move gave up the key piece.
 */
export function describePlan(plan, { userMove } = {}) {
  const { fen, L, threat } = plan;
  const steps = L.steps;
  if (!steps.length) return '';
  const s0 = steps[0];
  const first = num(s0);
  const Them = COLOR_NAME[opp(L.side)];
  const out = [];

  if (L.mateIdx >= 0) {
    const n = Math.floor(L.mateIdx / 2) + 1;
    out.push(n === 1 ? `${first.replace('#', '')} is checkmate.` : `${first} starts a forced mate in ${n}: ${lineText(steps.slice(0, L.mateIdx + 1))}.`);
    if (L.motif?.type === 'back-rank') out.push('The king is trapped behind its own pawns on the back rank.');
    return out.join(' ');
  }

  const m0 = motifsOfMove(fen, s0.uci).find((m) => SHOWN_MOTIFS.includes(m.type));
  if (m0) out.push(`${capitalize(describeMotif(m0, steps, first))}.`);
  else if (s0.captured && L.gain >= 1 && L.keyIdx === 0) {
    const why = captureReasons(fen, L, 0);
    out.push(`${first} wins ${winningsPhrase(L)}${why.length ? `: ${why.join(', and ')}` : ''}.`);
  } else if (threat) out.push(`${first} ${threatClause(threat)}.`);
  else out.push(`${first} ${describeQuietMove(fen, s0.uci)}.`);

  // Did the move deal with the opponent's threat, or leave it (because something matters more)?
  if (plan.oppThreat?.mate && !m0) {
    // A good move here has to stop the mate; only say so if we're not lost anyway.
    const tm = plan.oppThreat.move;
    if (plan.win === undefined || plan.win > 0.1) out.push(`It also stops ${Them}’s mating attack (which starts ${tm.color ? prose(tm.color, tm.san) : tm.san}).`);
  } else if (plan.oppThreat && !m0 && L.gain < 1) {
    const tm = plan.oppThreat.move;
    if (!threatPersists(s0.fenAfter, tm)) {
      out.push(`It also takes care of the threat — ${plan.oppThreat.text.replace(/^(\w+) threatens/, (x, who) => `${who} was threatening`)}`);
    } else {
      const victim = boardOf(s0.fenAfter).get(tm.to);
      out.push(`It leaves your ${victim ? pn(victim.type) : 'piece'} on ${tm.to} to be taken (${tm.color ? prose(tm.color, tm.san) : tm.san}) — ${plan.win >= 0.9 ? 'you’re still winning comfortably after that' : 'the engine judges that a price worth paying here'}.`);
    }
  }

  const r1 = steps[1];
  // A payoff that is a pawn queening, not a capture, is described as such.
  const wins = (S) => (S.promotion && !S.captured ? 'queens the pawn' : `wins ${winningsPhrase(L)}`);
  if (L.gain >= 1 && L.keyIdx === 2) {
    const S = steps[2];
    const why = captureReasons(fen, L, 2);
    out.push(why.caused
      ? `${Them}’s best answer is ${num(r1)} — but ${why.join(', and ')}, so ${num(S)} ${wins(S)}.`
      : `${Them}’s best answer is ${num(r1)}, and then ${num(S)} ${wins(S)}${why.length ? ` (${why.join(', and ')})` : ''}.`);
  } else if (L.gain >= 1 && L.keyIdx === 4) {
    const why = captureReasons(fen, L, 4);
    out.push(`${Them}’s best answer is ${num(r1)}; then after ${lineText(steps.slice(2, 4))}, ${num(steps[4])} ${wins(steps[4])}${why.length ? ` (${why.join(', and ')})` : ''}.`);
  } else if (threat && r1) {
    out.push(`${Them}’s best answer is ${num(r1)}.`);
  } else if (steps.length > 1 && !m0 && !(s0.captured && L.keyIdx === 0)) {
    out.push(`A likely continuation: ${lineText(steps.slice(0, 4))}.`);
  }

  if (userMove && userMove !== s0.uci) {
    const [mine] = playLine(fen, [userMove]);
    const keyPiece = threat?.steps[0]?.from || (L.keyIdx >= 2 ? steps[L.keyIdx].from : null);
    if (mine && keyPiece && mine.from === keyPiece) {
      out.push(`Your ${num(mine)} ${mine.captured ? 'trades off' : 'moves away'} the ${pn(mine.piece)} that ${threat ? 'makes that threat work' : 'wins the material'}.`);
    }
  }
  return out.join(' ');
}

/** "Your knight isn't doing much" style goals for quiet moves, without naming the move. */
function quietGoal(fen, s0, Them) {
  const d = describeQuietMove(fen, s0.uci);
  const m = (re) => d.match(re);
  let x;
  if (/^castles/.test(d)) return 'Your king is still in the centre. Get it safe first.';
  if ((x = m(/^develops the (\w+)/))) return `You still have an undeveloped ${x[1]}. Bring it into the game.`;
  if (/claims the centre/.test(d)) return 'The centre is up for grabs — stake a claim with a pawn.';
  if (/takes the open/.test(d)) return 'There’s an open file. Make sure you own it.';
  if (/half-open/.test(d)) return 'A rook would do more on a half-open file.';
  if (/7th rank/.test(d)) return 'Your rook can invade the 7th rank.';
  if (/outpost/.test(d)) return 'There’s a square where a knight can’t be chased away. Find it.';
  if ((x = m(/attacks the (\w+) on ([a-h][1-8])/))) return { text: `${Them}’s ${x[1]} on ${x[2]} can be attacked.`, targets: [x[2]] };
  if ((x = m(/protects the (\w+) on ([a-h][1-8])/))) return { text: `Your ${x[1]} on ${x[2]} is under attack. Look after it.`, targets: [x[2]] };
  if (/out of danger/.test(d)) return 'One of your pieces is under attack.';
  if (/passed pawn/.test(d)) return 'You have a passed pawn. Passed pawns must be pushed.';
  if (/pawn storm/.test(d)) return 'Your pawns can join the attack on the king.';
  if (/fianchettoes/.test(d)) return 'Your bishop wants the long diagonal.';
  if (/activates the king/.test(d)) return 'In the endgame the king is a fighting piece. Use it.';
  if (/trades/.test(d)) return 'A trade helps you here. Which pair of pieces should come off?';
  if ((x = m(/opens the way for your (\w+)/))) return `Your ${x[1]} is hemmed in by one of your own pawns. Free it.`;
  if ((x = m(/supports the (\w+) on ([a-h][1-8])/))) return { text: `Your ${x[1]} on ${x[2]} is being challenged. Can you back it up?`, targets: [x[2]] };
  if (/escape square/.test(d)) return 'Your king could use some breathing room.';
  if (/away from .*pieces/.test(d)) return `Some of ${Them}’s pieces want to come forward. Take their squares away.`;
  if ((x = m(/aiming at the (\w+) on ([a-h][1-8])/))) return { text: `${Them}’s ${x[1]} on ${x[2]} is a target. Bring another piece to bear on it.`, targets: [x[2]] };
  if (/where it protects/.test(d)) return 'One of your pieces needs more protection.';
  return 'No tactic here. Find your least useful piece and give it a better job.';
}

/**
 * Three hints, each a step closer to the answer:
 *  1. the target or goal (never the move), 2. which piece, 3. the move and the whole idea.
 * `motif` (from a detected tactic) sharpens hint 1.
 */
export function planHints(plan, { motif = null } = {}) {
  const { fen, L, threat, oppThreat } = plan;
  const s0 = L.steps[0];
  if (!s0) return [];
  const B = boardOf(fen);
  const Them = COLOR_NAME[opp(L.side)];
  const piece = pn(B.get(s0.from).type);

  let h1, targets = [];
  if (L.mateIdx >= 0) h1 = MOTIFS.mate.hint;
  else if (motif && MOTIFS[motif] && !['material', 'check'].includes(motif)) h1 = MOTIFS[motif].hint;
  else if (oppThreat && L.gain < 1 && !threat) {
    const tm = oppThreat.move;
    const first = tm?.san ? (tm.color ? prose(tm.color, tm.san) : tm.san) : null;
    h1 = oppThreat.mate
      ? `First deal with ${Them}’s threat: there’s a mating attack coming${first ? `, starting with ${first}` : ''}.`
      : `First deal with ${Them}’s threat${first ? `: ${first}` : ''}. What does it attack, and how can you meet it?`;
    targets = oppThreat.squares.filter((sq) => sq !== s0.to && sq !== s0.from);
  } else if (threat) {
    const t0 = threat.steps[0];
    if (threat.mateIdx >= 0) h1 = `${Them}’s king is short of defenders. Can you create a mating threat?`;
    else if (t0.captured) {
      targets = [t0.to];
      const pin = pinNote(threat);
      h1 = `${Them}’s ${pn(t0.captured)} on ${t0.to} is weaker than it looks${pin ? ` — its defender on ${pin.defender} is lined up with its king` : ''}. Find a move that threatens it.`;
    } else h1 = 'Find a move that creates a threat your opponent has to answer.';
  } else if (L.gain >= 1 && L.keyIdx <= 4) {
    const S = L.steps[L.keyIdx];
    if (S.promotion && !S.captured) {
      h1 = 'You have a passed pawn close to queening. What stands in its way?';
    } else if (L.keyIdx > 0 && S.to === s0.to) {
      h1 = MOTIFS.material.hint; // naming the square would give the move away
    } else {
      targets = [S.to];
      h1 = L.keyIdx === 0
        ? `Look at ${S.to}: count its attackers and defenders.`
        : `Look at ${S.to}: count its attackers and defenders — and notice what happens when one of the defenders has to move.`;
    }
  } else {
    const g = quietGoal(fen, s0, Them);
    h1 = typeof g === 'string' ? g : g.text;
    targets = typeof g === 'string' ? [] : g.targets;
  }

  const marks1 = Object.fromEntries(targets.map((sq) => [sq, 'target']));
  const arrows3 = [{ startSquare: s0.from, endSquare: s0.to, color: 'rgba(34,197,94,0.9)' }];
  if (threat?.steps[0]) arrows3.push({ startSquare: threat.steps[0].from, endSquare: threat.steps[0].to, color: 'rgba(59,130,246,0.75)' });
  return [
    { text: h1, marks: marks1, arrows: [] },
    { text: `It’s a ${piece} move: your ${piece} on ${s0.from}.`, marks: { ...marks1, [s0.from]: 'hint' }, arrows: [] },
    { text: describePlan(plan), marks: {}, arrows: arrows3 },
  ];
}

/**
 * Hint ladder for trainers (review cards, puzzles): plans around the *expected* move so the
 * hints lead to the stored solution. Cached per position.
 */
export function hintProvider(engine, motif = null) {
  const cache = new Map();
  return (fen, expectedUci) => {
    const key = `${fen}|${expectedUci}`;
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        const res = await engine.analyze(fen, { depth: 14, movetime: 3000, ...(expectedUci ? { searchmoves: [expectedUci] } : {}) });
        if (!res?.lines[0]) return null;
        return planHints(await planOf(engine, fen, res.lines[0].pv, { opponentThreat: true }), { motif });
      })());
    }
    return cache.get(key);
  };
}

/** Lichess puzzle theme → our motif key (for theme-specific first hints). */
export const motifForTheme = (theme) => Object.entries(MOTIFS).find(([, m]) => m.theme === theme)?.[0] || null;
