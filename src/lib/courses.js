// Opening courses → position-keyed trees, repertoire lookups and review-card plumbing.
import { Chess } from 'chess.js';
import { epd, moveToUci } from './chessutil.js';
import { isDue, mastery } from './fsrs.js';

const modules = import.meta.glob('../data/courses/*.js', { eager: true });

const normMoves = (moves) =>
  typeof moves === 'string'
    ? moves.trim().split(/\s+/).map((san) => ({ san, note: null }))
    : moves.map((m) => (typeof m === 'string' ? { san: m, note: null } : { san: m[0], note: m[1] ?? null }));

export function buildCourse(c) {
  const learner = c.side === 'white' ? 'w' : 'b';
  const nodes = new Map();
  const lines = [];
  for (const l of c.lines || []) {
    const g = new Chess();
    const steps = [];
    for (const m of normMoves(l.moves || [])) {
      const fen = g.fen();
      let r = null;
      try { r = g.move(m.san, { strict: false }); } catch { r = null; }
      if (!r) break;
      const key = epd(fen);
      const uci = moveToUci(r);
      steps.push({ fen, epd: key, san: r.san, uci, color: r.color, note: m.note, learner: r.color === learner, fenAfter: g.fen() });
      let node = nodes.get(key);
      if (!node) { node = { fen, epd: key, learnerToMove: r.color === learner, moves: new Map() }; nodes.set(key, node); }
      let mv = node.moves.get(uci);
      if (!mv) { mv = { san: r.san, uci, note: null, lineIds: new Set(), weight: 0, toEpd: epd(g.fen()) }; node.moves.set(uci, mv); }
      if (!mv.note && m.note) mv.note = m.note;
      mv.lineIds.add(l.id);
      mv.weight += l.weight ?? 5;
    }
    lines.push({ ...l, courseId: c.id, steps, finalFen: g.fen() });
  }
  const groups = [];
  for (const l of lines) {
    let gr = groups.find((x) => x.name === (l.group || 'Lines'));
    if (!gr) { gr = { name: l.group || 'Lines', lines: [] }; groups.push(gr); }
    gr.lines.push(l);
  }
  return { ...c, learner, lines, lineById: new Map(lines.map((l) => [l.id, l])), nodes, groups };
}

export const COURSES = Object.values(modules)
  .map((m) => m.default)
  .filter((c) => c && c.id && Array.isArray(c.lines))
  .map(buildCourse)
  .sort((a, b) => (a.side === b.side ? a.name.localeCompare(b.name) : a.side === 'white' ? -1 : 1));

export const courseById = (id) => COURSES.find((c) => c.id === id);

export const cardIdFor = (courseId, positionEpd) => `op:${courseId}:${positionEpd}`;

export function cardForStep(course, step, line) {
  return {
    id: cardIdFor(course.id, step.epd),
    type: 'opening',
    courseId: course.id,
    lineId: line.id,
    fen: step.fen,
    epd: step.epd,
    answers: [step.uci],
    san: step.san,
    note: step.note,
    title: course.name,
    orientation: course.side,
  };
}

/** The learner's repertoire move in this position, from any active course for that colour. */
export function repertoireAt(fen, color, activeIds) {
  const key = epd(fen);
  for (const c of COURSES) {
    if (c.learner !== color || !activeIds.includes(c.id)) continue;
    const node = c.nodes.get(key);
    if (node?.learnerToMove) {
      const [mv] = node.moves.values();
      return { course: c, move: mv, cardId: cardIdFor(c.id, key) };
    }
  }
  return null;
}

/** Opponent moves the active courses prepare for, weighted (for the sparring persona). */
export function preparedOpponentMoves(fen, learnerColor, activeIds, cards) {
  const key = epd(fen);
  const out = new Map();
  for (const c of COURSES) {
    if (c.learner !== learnerColor || !activeIds.includes(c.id)) continue;
    const node = c.nodes.get(key);
    if (!node || node.learnerToMove) continue;
    for (const mv of node.moves.values()) {
      let w = 0;
      for (const lid of mv.lineIds) {
        const line = c.lineById.get(lid);
        const due = line.steps.filter((s) => s.learner && isDue(cards[cardIdFor(c.id, s.epd)]?.sched)).length;
        const unseen = line.steps.filter((s) => s.learner && !cards[cardIdFor(c.id, s.epd)]).length;
        w += (line.weight ?? 5) * (1 + 3 * due) * (unseen ? 0.4 : 1);
      }
      const prev = out.get(mv.uci);
      out.set(mv.uci, { uci: mv.uci, san: mv.san, weight: (prev?.weight || 0) + w, course: c });
    }
  }
  return [...out.values()];
}

export function lineStatus(course, line, cards) {
  const learnerSteps = line.steps.filter((s) => s.learner);
  const scheds = learnerSteps.map((s) => cards[cardIdFor(course.id, s.epd)]?.sched);
  const seen = scheds.filter((x) => x && x.state !== 'new');
  if (!seen.length) return { learned: false, level: 0, label: 'New', due: 0, total: learnerSteps.length };
  const levels = scheds.map((x) => mastery(x).level);
  const level = Math.min(...levels);
  const due = scheds.filter((x) => isDue(x)).length;
  return { learned: seen.length === scheds.length, level, label: mastery(scheds[levels.indexOf(level)]).label, due, total: learnerSteps.length };
}

export function courseProgress(course, cards) {
  const keys = [...course.nodes.values()].filter((n) => n.learnerToMove).map((n) => cardIdFor(course.id, n.epd));
  const scheds = keys.map((k) => cards[k]?.sched);
  const counts = [0, 0, 0, 0, 0];
  scheds.forEach((s) => counts[mastery(s).level]++);
  const learned = scheds.filter((s) => s && s.state !== 'new').length;
  const due = scheds.filter((s) => isDue(s)).length;
  const score = scheds.reduce((a, s) => a + mastery(s).level, 0) / (4 * Math.max(1, scheds.length));
  return { total: keys.length, learned, due, counts, score };
}

/**
 * Turns due opening cards into line runs: each run replays one line from move 1,
 * quizzing only the positions that are due (others are played automatically), so
 * moves are always recalled in the context of the game that leads to them.
 */
export function openingRuns(dueOpeningCards) {
  const byCourse = new Map();
  for (const c of dueOpeningCards) {
    if (!byCourse.has(c.courseId)) byCourse.set(c.courseId, new Set());
    byCourse.get(c.courseId).add(c.epd);
  }
  const runs = [];
  for (const [courseId, pending] of byCourse) {
    const course = courseById(courseId);
    if (!course) continue;
    while (pending.size) {
      let best = null, bestCover = 0;
      for (const line of course.lines) {
        const cover = line.steps.filter((s) => s.learner && pending.has(s.epd)).length;
        if (cover > bestCover || (cover === bestCover && cover && line.steps.length < best.steps.length)) { best = line; bestCover = cover; }
      }
      if (!best) break;
      const quiz = new Set(best.steps.filter((s) => s.learner && pending.has(s.epd)).map((s) => s.epd));
      quiz.forEach((k) => pending.delete(k));
      runs.push({ kind: 'line', courseId, lineId: best.id, quiz });
    }
  }
  return runs;
}
