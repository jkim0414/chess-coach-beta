// App-wide persisted state (localStorage) with a tiny subscribe/update API.
import { useSyncExternalStore } from 'react';
import { review, isDue, newSchedule } from './fsrs.js';

const KEY = 'chesscoach:v1';
const MAX_GAMES = 100;

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

function load() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    const base = freshState();
    return {
      ...base, ...s,
      settings: { ...base.settings, ...s.settings, custom: { ...base.settings.custom, ...s.settings?.custom } },
      stats: { ...base.stats, ...s.stats },
    };
  } catch {
    return freshState();
  }
}

let state = load();
const listeners = new Set();
let saveTimer = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or unavailable — keep running in memory */ }
  }, 250);
}

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
    const day = new Date(now).toISOString().slice(0, 10);
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
  update((s) => ({ ...s, games: [game, ...s.games.filter((g) => g.id !== game.id)].slice(0, MAX_GAMES) }));
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
  const s = JSON.parse(json);
  if (!s || typeof s !== 'object' || !s.cards || !s.settings) throw new Error('This file is not a Chess Coach backup.');
  update(() => ({ ...freshState(), ...s }));
}

export function resetAll() {
  update(() => freshState());
}

// Exposed for tests.
export function __setState(s) { state = s; listeners.forEach((l) => l()); }
export { freshState };
