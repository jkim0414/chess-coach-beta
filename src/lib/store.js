// App-wide persisted state (localStorage) with a tiny subscribe/update API.
import { useSyncExternalStore } from 'react';
import { review, isDue, newSchedule } from './fsrs.js';

const KEY = 'chesscoach:v1';
const MAX_GAMES = 100;
// Browsers give a site a few MB of localStorage (about 2.5 million characters on iPhone), and a
// game's move-by-move record is the bulky part. Only the most recent games keep theirs; older
// ones keep the result and PGN, which is enough to replay them.
const FULL_GAMES = 40;

/** Calendar day in the user's own timezone, "2026-11-02" — the key for per-day stats. */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export const DEFAULT_SETTINGS = {
  coachMode: 'coach',        // 'guided' | 'coach' | 'exam'
  threatPrompts: true,
  showEval: false,
  persona: 'classicist',
  strength: 1200,
  userColor: 'white',        // 'white' | 'black' | 'random'
  custom: { style: 'balanced', white: 'e4', black: 'e5' },
  puzzleDifficulty: 'normal',
};

function freshState() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    cards: {},
    courses: {},
    games: [],
    stats: {
      threat: { asked: 0, correct: 0, streak: 0 },
      motifs: {},
      phases: { opening: 0, middlegame: 0, endgame: 0 },
      days: {},
      puzzles: {},
    },
  };
}

/** Saved or imported data, with anything missing (older versions, hand-edited backups) filled in. */
function normalize(s) {
  const base = freshState();
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const stats = obj(s.stats);
  return {
    ...base, ...s,
    settings: { ...base.settings, ...obj(s.settings), custom: { ...base.settings.custom, ...obj(obj(s.settings).custom) } },
    cards: obj(s.cards),
    courses: obj(s.courses),
    games: Array.isArray(s.games) ? s.games : [],
    stats: {
      ...base.stats, ...stats,
      threat: { ...base.stats.threat, ...obj(stats.threat) },
      motifs: obj(stats.motifs), phases: { ...base.stats.phases, ...obj(stats.phases) }, days: obj(stats.days), puzzles: obj(stats.puzzles),
    },
  };
}

function load() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return raw ? normalize(JSON.parse(raw)) : freshState();
  } catch {
    return freshState();
  }
}

let state = load();
const listeners = new Set();
let saveTimer = null;
// True when the last save didn't reach storage (full or blocked): progress is then only in memory.
let saveFailed = false;

function flush() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  let failed = false;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { failed = true; }
  if (failed !== saveFailed) { saveFailed = failed; listeners.forEach((l) => l()); }
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

// Closing the tab or swiping the app away mustn't lose the last quarter-second of changes.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

export const saveHasFailed = () => saveFailed;

export function getState() { return state; }

export function update(fn) {
  const next = fn(state);
  if (!next || next === state) return;
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function useSaveFailed() {
  return useSyncExternalStore(subscribe, saveHasFailed, saveHasFailed);
}

// ── settings ────────────────────────────────────────────────────────────────
export function setSettings(patch) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

// ── cards ───────────────────────────────────────────────────────────────────
export function upsertCard(card) {
  update((s) => {
    const prev = s.cards[card.id];
    const merged = { created: Date.now(), ...prev, ...card, sched: prev?.sched || card.sched || newSchedule() };
    return { ...s, cards: { ...s.cards, [card.id]: merged } };
  });
  return state.cards[card.id];
}

export function reviewCard(id, rating, now = Date.now()) {
  update((s) => {
    const c = s.cards[id];
    if (!c) return s;
    const day = dayKey(now);
    return {
      ...s,
      cards: { ...s.cards, [id]: { ...c, sched: review(c.sched, rating, now), lastRating: rating } },
      stats: { ...s.stats, days: { ...s.stats.days, [day]: (s.stats.days[day] || 0) + 1 } },
    };
  });
}

export function removeCard(id) {
  update((s) => {
    const cards = { ...s.cards };
    delete cards[id];
    return { ...s, cards };
  });
}

export function dueCards(cards = state.cards, now = Date.now()) {
  return Object.values(cards).filter((c) => isDue(c.sched, now));
}

// ── courses ─────────────────────────────────────────────────────────────────
export function setCourseActive(courseId, active) {
  update((s) => ({ ...s, courses: { ...s.courses, [courseId]: { learned: {}, ...s.courses[courseId], active } } }));
}

export function markLineLearned(courseId, lineId) {
  update((s) => {
    const c = s.courses[courseId] || { active: true, learned: {} };
    return { ...s, courses: { ...s.courses, [courseId]: { ...c, active: c.active ?? true, learned: { ...c.learned, [lineId]: Date.now() } } } };
  });
}

// ── games & stats ───────────────────────────────────────────────────────────
export function saveGame(game) {
  update((s) => ({
    ...s,
    games: [game, ...s.games.filter((g) => g.id !== game.id)].slice(0, MAX_GAMES)
      .map((g, i) => (i < FULL_GAMES || !g.plies?.length ? g : { ...g, plies: [] })),
  }));
}

export function recordThreatAnswer(correct) {
  update((s) => {
    const t = s.stats.threat;
    return { ...s, stats: { ...s.stats, threat: { asked: t.asked + 1, correct: t.correct + (correct ? 1 : 0), streak: correct ? t.streak + 1 : 0 } } };
  });
}

export function recordMotif(motif, found) {
  if (!motif) return;
  update((s) => {
    const m = s.stats.motifs[motif] || { seen: 0, found: 0 };
    return { ...s, stats: { ...s.stats, motifs: { ...s.stats.motifs, [motif]: { seen: m.seen + 1, found: m.found + (found ? 1 : 0) } } } };
  });
}

export function recordPhaseMistake(phase) {
  update((s) => ({ ...s, stats: { ...s.stats, phases: { ...s.stats.phases, [phase]: (s.stats.phases[phase] || 0) + 1 } } }));
}

export function recordPuzzle(theme, solved) {
  update((s) => {
    const p = s.stats.puzzles[theme] || { tried: 0, solved: 0 };
    return { ...s, stats: { ...s.stats, puzzles: { ...s.stats.puzzles, [theme]: { tried: p.tried + 1, solved: p.solved + (solved ? 1 : 0) } } } };
  });
}

// ── backup ──────────────────────────────────────────────────────────────────
export function exportData() {
  return JSON.stringify(state, null, 1);
}

export function importData(json) {
  let s = null;
  try { s = JSON.parse(json); } catch { s = null; }
  if (!s || typeof s !== 'object' || !s.cards || !s.settings) throw new Error('This file is not a Chess Coach backup.');
  update(() => normalize(s));
}

export function resetAll() {
  update(() => freshState());
}

// Exposed for tests.
export function __setState(s) { state = s; listeners.forEach((l) => l()); }
export { freshState };
