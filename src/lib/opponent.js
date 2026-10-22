// Computer opponents with a recognisable style. Stockfish has no "style" knobs, so the
// opponent asks for several candidate moves and chooses among those that are close
// enough in value, nudged by a style score and sampled with human-like variance.
import { Chess } from 'chess.js';
import { bookMovesAt } from './openings.js';
import { preparedOpponentMoves } from './courses.js';
import { cpOf } from './evaluation.js';
import { boardOf, see, kingZone, countAttacks } from './tactics.js';
import { VALUES, opp, coords, tryMove, moveToUci, materialBalance, turnOf } from './chessutil.js';

export const STYLES = {
  balanced: { name: 'Balanced', blurb: 'Objectively good moves with natural variety.' },
  tactical: { name: 'Tactical', blurb: 'Checks, captures, sacrifices and attacks on your king.' },
  positional: { name: 'Positional', blurb: 'Quiet improving moves, structure, slow squeezes.' },
  solid: { name: 'Solid', blurb: 'Trades pieces, avoids risk, keeps its king safe.' },
};

export const OPENING_CHOICES = {
  white: [
    { id: 'e4', label: '1.e4 — open games', tags: ['e4', 'italian', 'ruy', 'scotch', 'open-sicilian'] },
    { id: 'd4', label: '1.d4 — Queen’s Gambit', tags: ['d4', 'qg', 'catalan'] },
    { id: 'london', label: 'London System', tags: ['d4', 'london', 'colle'] },
    { id: 'gambits', label: 'Gambits', tags: ['e4', 'kings-gambit', 'evans', 'danish', 'smith-morra', 'fried-liver'] },
    { id: 'english', label: '1.c4 / 1.Nf3 — flank', tags: ['c4', 'english', 'nf3', 'reti'] },
    { id: 'any', label: 'Mixed', tags: [] },
  ],
  black: [
    { id: 'e5', label: '1…e5 & 1…d5 — classical', tags: ['e5', 'qgd', 'd5'] },
    { id: 'sicilian', label: 'Sicilian & King’s Indian — sharp', tags: ['sicilian', 'kid', 'benoni'] },
    { id: 'french', label: 'French & QGD — solid', tags: ['french', 'qgd'] },
    { id: 'caro', label: 'Caro-Kann & Slav — rock solid', tags: ['caro', 'slav'] },
    { id: 'scandi', label: 'Scandinavian & Dutch — offbeat', tags: ['scandi', 'dutch', 'offbeat'] },
    { id: 'any', label: 'Mixed', tags: [] },
  ],
};

export const PERSONAS = [
  {
    id: 'classicist', name: 'The Classicist', icon: '♔', style: 'balanced',
    tagline: '1.e4 and 1…e5. Open, principled chess.',
    about: 'Plays the Italian, Ruy Lopez and Open Sicilian as White and meets 1.e4 with 1…e5. The best all-round sparring partner: the punishment for bad moves is clean and instructive.',
    book: { w: ['e4', 'italian', 'ruy', 'scotch', 'open-sicilian'], b: ['e5', 'qgd', 'd5'] },
  },
  {
    id: 'strategist', name: 'The Strategist', icon: '♕', style: 'positional',
    tagline: '1.d4 and the Queen’s Gambit. Slow squeezes.',
    about: 'Queen’s Gambit and Catalan as White; QGD, Slav and Nimzo as Black. Prefers small, lasting edges — teaches you to make plans instead of waiting for tactics.',
    book: { w: ['d4', 'qg', 'catalan'], b: ['qgd', 'slav', 'nimzo', 'caro', 'd5'] },
  },
  {
    id: 'attacker', name: 'The Attacker', icon: '♞', style: 'tactical',
    tagline: 'Gambits, sacrifices, king hunts.',
    about: 'King’s Gambit, Evans, Danish and Smith-Morra as White; Sicilian, King’s Indian and Dutch as Black. Teaches you to defend calmly, give material back at the right moment, and punish unsound attacks.',
    book: { w: ['e4', 'kings-gambit', 'evans', 'danish', 'smith-morra', 'fried-liver', 'open-sicilian'], b: ['sicilian', 'kid', 'dutch', 'benoni', 'budapest'] },
  },
  {
    id: 'grinder', name: 'The Grinder', icon: '♜', style: 'solid',
    tagline: 'London System and Caro-Kann. Trades and endgames.',
    about: 'The London and Colle as White; Caro-Kann and Slav as Black. Trades pieces and waits for you to over-press — teaches patience, pawn structure and endgame technique.',
    book: { w: ['d4', 'london', 'colle'], b: ['caro', 'qgd', 'slav'] },
  },
  {
    id: 'sparring', name: 'Repertoire Sparring', icon: '📖', style: 'balanced',
    tagline: 'Steers into the openings you’re learning.',
    about: 'Plays the opponent’s side of your active courses, favouring lines that are due for review, so every game doubles as opening practice. Falls back to the Classicist outside your prep.',
    book: 'repertoire',
  },
  {
    id: 'custom', name: 'Custom', icon: '⚙︎', style: null,
    tagline: 'Pick the style and openings yourself.',
    about: 'Choose a playing style and which openings the opponent plays with each colour.',
    book: null,
  },
];

export const personaById = (id) => PERSONAS.find((p) => p.id === id) || PERSONAS[0];

export function resolvePersona(id, custom) {
  const p = personaById(id);
  if (p.id !== 'custom') return p;
  const w = OPENING_CHOICES.white.find((o) => o.id === custom?.white) || OPENING_CHOICES.white[0];
  const b = OPENING_CHOICES.black.find((o) => o.id === custom?.black) || OPENING_CHOICES.black[0];
  const style = STYLES[custom?.style] ? custom.style : 'balanced';
  return { ...p, style, tagline: `${STYLES[style].name} · ${w.label} · ${b.label}`, book: { w: w.tags, b: b.tags } };
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const FIRST_MOVES = new Set(['e4', 'd4', 'c4', 'nf3', 'flank']);

export function strengthParams(elo) {
  const t = clamp((elo - 600) / 1800, 0, 1);
  return {
    depth: Math.round(5 + t * 9),
    multipv: 6,
    temperature: 140 * Math.pow(1 - t, 1.6) + 6,
    blunder: 0.14 * Math.pow(1 - t, 2),
    maxLoss: 450 - 380 * t,
    bookPlies: Math.round(6 + 14 * t),
    styleWeight: 0.6 + 0.4 * t,
  };
}

export const STRENGTH_LABELS = [
  [800, 'Beginner'], [1100, 'Casual'], [1400, 'Club'], [1700, 'Strong club'], [2000, 'Expert'], [2600, 'Master'],
];
export const strengthLabel = (elo) => STRENGTH_LABELS.find(([max]) => elo < max)?.[1] ?? 'Master';

function centrality(square) {
  const [f, r] = coords(square);
  return 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 4.5));
}

/** Style preference for a candidate move, in centipawns (positive = this persona likes it). */
export function styleBonus(style, fen, uci) {
  if (!style || style === 'balanced') return 0;
  const g = new Chess(fen);
  const side = g.turn();
  const before = boardOf(g);
  const r = tryMove(g, uci);
  if (!r) return 0;
  const after = boardOf(g);
  const enemyZoneBefore = kingZone(before, opp(side));
  const enemyZoneAfter = kingZone(after, opp(side));
  const f = {
    check: g.isCheck() ? 1 : 0,
    capture: r.captured ? 1 : 0,
    sac: !r.captured && (see(after, r.to, opp(side)) ?? 0) >= 2 ? 1 : 0,
    kingPressure: countAttacks(after, side, enemyZoneAfter) - countAttacks(before, side, enemyZoneBefore),
    trade: r.captured && VALUES[r.captured] === VALUES[r.piece] ? 1 : 0,
    queenTrade: r.captured === 'q' && r.piece === 'q' ? 1 : 0,
    castle: r.flags.includes('k') || r.flags.includes('q') ? 1 : 0,
    central: r.piece !== 'p' && r.piece !== 'k' ? centrality(r.to) - centrality(r.from) : 0,
    pawnStorm: 0,
    ownShield: 0,
  };
  if (r.piece === 'p') {
    const ek = [...after].find(([, p]) => p.type === 'k' && p.color === opp(side));
    const ok = [...after].find(([, p]) => p.type === 'k' && p.color === side);
    const file = coords(r.to)[0];
    const rel = side === 'w' ? coords(r.to)[1] : 9 - coords(r.to)[1];
    if (ek && Math.abs(coords(ek[0])[0] - file) <= 1 && rel >= 4) f.pawnStorm = 1;
    if (ok && Math.abs(coords(ok[0])[0] - file) <= 1 && rel <= 3) f.ownShield = 1;
  }
  const ahead = materialBalance(g, side) >= 2;
  switch (style) {
    case 'tactical':
      return 30 * f.check + 15 * f.capture + 8 * f.kingPressure + 25 * f.sac + 18 * f.pawnStorm - 20 * f.queenTrade - 8 * f.trade;
    case 'positional':
      return 9 * f.central - 25 * f.sac + (ahead ? 14 : -5) * f.trade - 12 * f.ownShield + 6 * f.castle + (!f.capture && !f.check ? 6 : 0);
    case 'solid':
      return 18 * f.trade + 35 * f.queenTrade - 30 * f.sac - 15 * f.pawnStorm - 15 * f.ownShield + 15 * f.castle - 4 * f.check;
    default:
      return 0;
  }
}

function pickWeighted(items, rng) {
  const total = items.reduce((a, x) => a + x.weight, 0);
  let t = rng() * total;
  for (const x of items) { t -= x.weight; if (t <= 0) return x; }
  return items[items.length - 1];
}

function naturalMove(fen, rng) {
  const g = new Chess(fen);
  const B = boardOf(g);
  const side = g.turn();
  const moves = g.moves({ verbose: true }).map((m) => {
    let w = 1;
    if (m.captured) w += 2;
    if (m.san.includes('+')) w += 1;
    if ((see(B, m.from, opp(side)) ?? 0) > 0) w += 2; // a piece under attack — humans move it
    if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === (side === 'w' ? '1' : '8')) w += 1;
    if (m.piece === 'k' && !m.flags.includes('k') && !m.flags.includes('q')) w *= 0.3;
    return { uci: moveToUci(m), weight: w };
  });
  return moves.length ? pickWeighted(moves, rng).uci : null;
}

/**
 * Choose the opponent's move.
 * @returns {Promise<{uci, source:'book'|'repertoire'|'engine'|'blunder', name?} | null>} null if cancelled.
 */
export async function chooseMove(engine, fen, { persona, elo, ply, learnerColor, activeCourseIds = [], cards = {}, rng = Math.random }) {
  const p = strengthParams(elo);
  const color = turnOf(fen);

  if (ply < p.bookPlies + (persona.book === 'repertoire' ? 8 : 0)) {
    if (persona.book === 'repertoire') {
      const prep = preparedOpponentMoves(fen, learnerColor, activeCourseIds, cards);
      if (prep.length) {
        const m = pickWeighted(prep, rng);
        return { uci: m.uci, source: 'repertoire', name: m.course.name };
      }
    }
    const tags = persona.book === 'repertoire' || !persona.book ? personaById('classicist').book[color] : persona.book[color] || [];
    const moves = bookMovesAt(fen);
    if (moves.length) {
      // Persona identity: if its own systems have a move here, it plays one of those
      // most of the time; otherwise (or occasionally, for variety) any book move,
      // nudged towards lines that at least share its first move.
      const systemTags = tags.filter((t) => !FIRST_MOVES.has(t));
      const isSystem = (l) => systemTags.some((t) => l.tags.has(t));
      const own = moves.map((m) => ({ ...m, weight: m.lines.filter(isSystem).reduce((a, l) => a + l.weight, 0) })).filter((m) => m.weight > 0);
      const any = moves.map((m) => ({ ...m, weight: m.lines.reduce((a, l) => a + l.weight * (tags.some((t) => l.tags.has(t)) ? 4 : 1), 0) }));
      const m = own.length && rng() < 0.88 ? pickWeighted(own, rng) : pickWeighted(any, rng);
      const best = m.lines.find(isSystem) || m.lines[0];
      return { uci: m.uci, source: 'book', name: best?.name };
    }
  }

  const res = await engine.analyze(fen, { depth: p.depth, multipv: p.multipv, movetime: 2500 });
  if (!res) return null;
  if (!res.lines.length) return res.bestmove ? { uci: res.bestmove, source: 'engine' } : null;

  const bestCp = cpOf(res.lines[0].score);
  const winningMate = res.lines[0].score.type === 'mate' && res.lines[0].score.value > 0;
  if (!winningMate && res.lines.length >= 3 && rng() < p.blunder) {
    const u = rng() < 0.5 ? naturalMove(fen, rng) : res.lines[res.lines.length - 1].pv[0];
    if (u) return { uci: u, source: 'blunder' };
  }
  if (winningMate && elo >= 1000) return { uci: res.lines[0].pv[0], source: 'engine', score: res.lines[0].score };

  const cands = res.lines
    .filter((l) => bestCp - cpOf(l.score) <= p.maxLoss)
    .map((l) => {
      const loss = bestCp - cpOf(l.score);
      const bonus = styleBonus(persona.style, fen, l.pv[0]) * p.styleWeight;
      return { uci: l.pv[0], score: l.score, u: -loss + bonus };
    });
  const maxU = Math.max(...cands.map((c) => c.u));
  const weighted = cands.map((c) => ({ ...c, weight: Math.exp((c.u - maxU) / p.temperature) }));
  const m = pickWeighted(weighted, rng);
  return { uci: m.uci, source: 'engine', score: m.score };
}
