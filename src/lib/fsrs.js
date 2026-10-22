// FSRS-4.5 spaced-repetition scheduler (the algorithm behind modern Anki), with its
// published default weights. Grades are assigned automatically from how the learner
// actually performed on the board — no self-rating buttons.

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const RETENTION = 0.9;
const DAY = 86400000;
const MAX_INTERVAL_DAYS = 365;

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };

const clampD = (d) => Math.min(10, Math.max(1, d));
export const retrievability = (elapsedDays, s) => Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
const intervalFor = (s) => Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round((s / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1))));
const initS = (g) => Math.max(W[g - 1], 0.1);
const initD = (g) => clampD(W[4] - (g - 3) * W[5]);
const nextD = (d, g) => clampD(W[7] * W[4] + (1 - W[7]) * (d - W[6] * (g - 3)));
const recallS = (d, s, r, g) =>
  s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
const forgetS = (d, s, r) => Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]));

export function newSchedule() {
  return { state: 'new', due: 0, stability: 0, difficulty: 0, reps: 0, lapses: 0, last: 0 };
}

/**
 * Apply a review. Failed cards come back after a short relearning step (10 minutes)
 * so they reappear later in the same session; passed cards get an FSRS interval.
 */
export function review(sched, rating, now = Date.now()) {
  const s = { ...(sched || newSchedule()) };
  if (s.state === 'new' || !s.stability) {
    s.stability = initS(rating);
    s.difficulty = initD(rating);
  } else {
    const elapsed = Math.max(0, (now - s.last) / DAY);
    const r = retrievability(elapsed, s.stability);
    s.difficulty = nextD(s.difficulty, rating);
    s.stability = rating === Rating.Again ? forgetS(s.difficulty, s.stability, r) : recallS(s.difficulty, s.stability, r, rating);
  }
  s.reps += 1;
  s.last = now;
  if (rating === Rating.Again) {
    if (s.state === 'review') s.lapses += 1;
    s.state = 'relearning';
    s.due = now + 10 * 60 * 1000;
  } else {
    s.state = 'review';
    s.due = now + intervalFor(s.stability) * DAY;
  }
  return s;
}

export const isDue = (sched, now = Date.now()) => !!sched && sched.state !== 'new' && sched.due <= now;

export function mastery(sched) {
  if (!sched || sched.state === 'new') return { level: 0, label: 'New' };
  if (sched.state === 'relearning') return { level: 1, label: 'Learning' };
  if (sched.stability < 7) return { level: 2, label: 'Young' };
  if (sched.stability < 30) return { level: 3, label: 'Strong' };
  return { level: 4, label: 'Mastered' };
}

/** Rating from performance: wrong → Again; hints or slow → Hard; clean → Good; clean, fast and familiar → Easy. */
export function autoRating({ correct, hintsUsed = 0, attempts = 1, ms = 0, reps = 0, slowMs = 20000, fastMs = 4000 }) {
  if (!correct || attempts > 2 || hintsUsed >= 2) return Rating.Again;
  if (attempts === 2 || hintsUsed === 1 || ms > slowMs) return Rating.Hard;
  if (ms && ms < fastMs && reps >= 2) return Rating.Easy;
  return Rating.Good;
}

export function formatInterval(ms) {
  const m = ms / 60000;
  if (m < 60) return `${Math.max(1, Math.round(m))}m`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  const mo = d / 30;
  if (mo < 12) return `${Math.round(mo)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}
