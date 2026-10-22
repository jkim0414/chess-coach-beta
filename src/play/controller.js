// The live game: a coach sitting next to you.
//
// Each of your turns: (1) a fast null-move search asks "what does the opponent
// threaten?" and, if something real is hanging, quizzes you before you move;
// (2) a deeper MultiPV search runs while you think and detects critical moments;
// (3) your move is graded against it. Mistakes and missed tactics stop the game:
// you retry (with a hint ladder) or see the answer, and the position becomes a
// spaced-repetition card. When you find a combination, you play it to the end.
//
// No React in here — the UI subscribes to snapshots — so the whole flow can be
// driven from tests with a real engine.
import { Chess } from 'chess.js';
import { epd, opp, uciToObj, moveToUci, nullMoveFen, gamePhase, COLOR_NAME, uciToSan, formatLine } from '../lib/chessutil.js';
import { winOf, gradeFromLoss, gameAccuracy, GRADES } from '../lib/evaluation.js';
import { analyzeLine } from '../lib/tactics.js';
import { explainMistake, explainThreat, explainConsequence, MOTIFS, describeQuietMove, prose, capitalize } from '../lib/explain.js';
import { planOf, planSync, describePlan, planHints } from '../lib/plan.js';
import { chooseMove, resolvePersona } from '../lib/opponent.js';
import { openingOf, bookMovesAt } from '../lib/openings.js';
import { repertoireAt, COURSES } from '../lib/courses.js';
import { autoRating, Rating } from '../lib/fsrs.js';
import * as store from '../lib/store.js';
import { themeName } from '../puzzles/lichess.js';

export const COACH_DEPTH = 16;
const COACH_MOVETIME = 4000;
// Before calling a move an inaccuracy or worse, re-search it head-to-head against the
// engine's choice: shallow searches flip between near-equal moves.
const VERIFY_DEPTH = 18;
const VERIFY_MOVETIME = 6000;
const THREAT_DEPTH = 10;

const LIVE_KEY = 'chesscoach:live';
const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

let feedSeq = 0;
const fidBase = Date.now().toString(36);
const fid = () => `f${fidBase}-${++feedSeq}`;

/**
 * Should we quiz "what is the opponent threatening?" here? Not straight after they captured
 * something — the question then is whether to take back, not what the threat is.
 */
export function threatCheckApplies(lastPly) {
  return !(lastPly && lastPly.by === 'opp' && lastPly.san.includes('x'));
}

/**
 * Is this a threat worth asking about? Only a direct one: a capture next move that wins
 * real material, or mate. ("If you passed, they'd retreat and win something later" isn't.)
 */
export function isRealThreat(th) {
  return !!th && (th.mate || (th.gain >= 2 && !!th.move.captured));
}

export function detectMoment(fen, lines, oppLoss = 0) {
  if (!lines?.length || !lines[1]) return null; // a forced move is not a "moment"
  const best = lines[0];
  const w1 = winOf(best.score);
  const w2 = winOf(lines[1].score);
  const gap = w1 - w2;
  const L = analyzeLine(fen, best.pv, 12);
  if (best.score.type === 'mate' && best.score.value > 0 && best.score.value <= 4 && gap >= 0.08) {
    return { type: 'mate', motif: L.motif?.type === 'back-rank' ? 'back-rank' : 'mate', L, gap };
  }
  if (gap >= 0.12 && L.gain >= 2 && w1 >= 0.55) return { type: 'tactic', motif: L.motif?.type || 'material', L, gap };
  if (gap >= 0.2 && w1 < 0.55 && w1 > 0.06) return { type: 'defend', motif: 'defend', L, gap };
  if (oppLoss >= 0.15 && gap >= 0.08 && w1 >= 0.6) return { type: 'punish', motif: L.gain >= 1 ? L.motif?.type || 'material' : null, L, gap };
  return null;
}

/** "Practise forks" button for the pattern drawer, when the motif has a puzzle theme. */
function practise(motif) {
  const theme = MOTIFS[motif]?.theme;
  return theme ? [{ label: `Practise ${themeName(theme).toLowerCase()}`, action: 'pattern', theme }] : undefined;
}

const MOMENT_TEXT = {
  tactic: { title: 'There’s a tactic here', text: 'Something wins material by force. Take your time — checks, captures, threats.' },
  mate: { title: 'You have a forced mate', text: 'Look at every check. One sequence leaves the king no escape.' },
  defend: { title: 'Danger — one move holds', text: 'Most moves lose here. First ask what your opponent is threatening.' },
  punish: { title: 'Your opponent slipped', text: 'Their last move was a mistake. What did it allow?' },
};

function initialState() {
  return {
    status: 'idle', config: null, persona: null, userColor: 'w',
    fen: new Chess().fen(), plies: [], feed: [], active: null,
    turn: 'user', thinking: false, grading: false, locked: false,
    arrows: [], marks: {}, lastMove: null, evalScore: null, opening: null,
    result: null, summary: null, gameId: null,
  };
}

export class GameController {
  constructor({ engine, rng = Math.random, oppDelay = 450, wait } = {}) {
    this.engine = engine;
    this.rng = rng;
    this.oppDelay = oppDelay;
    this.wait = wait || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.listeners = new Set();
    this.gen = 0;
    this.chess = new Chess();
    this.threatsAsked = new Set();
    this.t = null;
    this.s = initialState();
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  getState = () => this.s;
  set(patch) {
    const prev = this.s;
    this.s = { ...this.s, ...patch };
    if (this.s.plies !== prev.plies || this.s.status !== prev.status) this.saveLive();
    this.listeners.forEach((l) => l());
  }

  // ── surviving a reload ──────────────────────────────────────────────────
  saveLive() {
    try {
      const st = storage();
      if (!st) return;
      if (this.s.status !== 'playing') { st.removeItem(LIVE_KEY); return; }
      const { config, gameId, plies, feed, opening, userColor } = this.s;
      st.setItem(LIVE_KEY, JSON.stringify({ config, gameId, userColor, plies: plies.map((p) => { const q = { ...p }; delete q.bestPv; delete q.movePv; return q; }), feed: feed.slice(-12), opening, savedAt: Date.now() }));
    } catch { /* storage unavailable */ }
  }

  /** A saved in-progress game, if any: {persona, moves, savedAt}. */
  resumable() {
    try {
      const raw = storage()?.getItem(LIVE_KEY);
      if (!raw) return null;
      const g = JSON.parse(raw);
      if (!g.plies?.length) return null;
      return { personaName: resolvePersona(g.config.personaId, g.config.custom).name, moves: g.plies.length, savedAt: g.savedAt };
    } catch { return null; }
  }

  resume() {
    let g;
    try { g = JSON.parse(storage()?.getItem(LIVE_KEY) || 'null'); } catch { g = null; }
    if (!g) return false;
    this.gen++;
    this.engine.cancel();
    this.chess = new Chess(g.config.fen || undefined);
    this.threatsAsked = new Set();
    for (const p of g.plies) {
      try { this.chess.move(uciToObj(p.uci)); } catch { return false; }
    }
    const persona = resolvePersona(g.config.personaId, g.config.custom);
    const userColor = g.userColor || 'w';
    const last = g.plies[g.plies.length - 1];
    this.set({
      ...initialState(), status: 'playing', config: g.config, persona, userColor, gameId: g.gameId,
      plies: g.plies, feed: g.feed || [], opening: g.opening || null, fen: this.chess.fen(),
      lastMove: last ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } : null,
    });
    this.feed({ tone: 'info', title: 'Game resumed', text: 'Picking up where you left off.' });
    if (this.chess.turn() === userColor) this.userTurn(); else this.oppTurn();
    return true;
  }

  discardLive() {
    try { storage()?.removeItem(LIVE_KEY); } catch { /* ignore */ }
  }

  feed(entry) {
    const e = { id: fid(), ply: this.s.plies.length, ...entry };
    this.set({ feed: [...this.s.feed, e].slice(-60) });
    return e;
  }

  updateFeed(id, patch) {
    this.set({ feed: this.s.feed.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  get settings() { return store.getState().settings; }
  get activeCourseIds() { return Object.entries(store.getState().courses).filter(([, c]) => c.active).map(([id]) => id); }

  // ── lifecycle ───────────────────────────────────────────────────────────
  start(config) {
    this.gen++;
    this.engine.cancel();
    this.engine.newGame();
    this.chess = new Chess(config.fen || undefined);
    this.threatsAsked = new Set();
    const userColor = config.userColor === 'random' ? (this.rng() < 0.5 ? 'w' : 'b') : config.userColor === 'black' || config.userColor === 'b' ? 'b' : 'w';
    const persona = resolvePersona(config.personaId, config.custom);
    this.chess.setHeader('White', userColor === 'w' ? 'You' : persona.name);
    this.chess.setHeader('Black', userColor === 'b' ? 'You' : persona.name);
    this.chess.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'));
    this.set({
      ...initialState(), status: 'playing', config: { ...config }, persona, userColor,
      gameId: `g${Date.now().toString(36)}`, fen: this.chess.fen(),
      turn: this.chess.turn() === userColor ? 'user' : 'opp',
    });
    const coachIntro = config.coachMode === 'exam'
      ? 'Exam mode: I’ll stay quiet and go through everything with you after the game.'
      : config.coachMode === 'guided'
        ? 'Guided mode: I’ll flag critical moments before you move and stop you after mistakes.'
        : 'Coach mode: play your game. I won’t announce tactics — spotting them is the skill — but I’ll stop you after mistakes and missed chances.';
    this.feed({ tone: 'info', title: `vs ${persona.name}`, text: coachIntro, keep: true });
    if (this.chess.turn() === userColor) this.userTurn(); else this.oppTurn();
  }

  stop() {
    this.gen++;
    this.engine.cancel();
  }

  resign() {
    if (this.s.status !== 'playing') return;
    this.finish({ winner: opp(this.s.userColor), reason: 'resignation' });
  }

  /** Take back to your previous move. */
  takeBack() {
    if (this.s.status === 'idle') return;
    const plies = [...this.s.plies];
    if (!plies.some((p) => p.by === 'user')) return;
    this.gen++;
    this.engine.cancel();
    while (plies.length) {
      const p = plies.pop();
      this.chess.undo();
      if (p.by === 'user') break;
    }
    // If that leaves the opponent to move (we were mid-drill), keep undoing to a user turn.
    while (plies.length && this.chess.turn() !== this.s.userColor) { plies.pop(); this.chess.undo(); }
    const last = plies[plies.length - 1];
    // The coach's notes describe the game as it now stands: drop notes about moves that were taken back.
    const n = plies.length;
    const feed = this.s.feed.filter((e) => e.keep || e.ply <= n);
    const fens = [this.s.config.fen || new Chess().fen(), ...plies.map((p) => p.fenAfter)];
    this.set({
      plies, feed, opening: openingOf(fens), fen: this.chess.fen(),
      lastMove: last ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } : null,
      active: null, arrows: [], marks: {}, status: 'playing', result: null, summary: null,
      thinking: false, grading: false, locked: false,
    });
    if (this.chess.turn() === this.s.userColor) this.userTurn(); else this.oppTurn();
  }

  checkEnd() {
    const g = this.chess;
    if (!g.isGameOver()) return false;
    let result;
    if (g.isCheckmate()) result = { winner: opp(g.turn()), reason: 'checkmate' };
    else if (g.isStalemate()) result = { winner: null, reason: 'stalemate' };
    else if (g.isThreefoldRepetition()) result = { winner: null, reason: 'threefold repetition' };
    else if (g.isInsufficientMaterial()) result = { winner: null, reason: 'insufficient material' };
    else result = { winner: null, reason: '50-move rule' };
    this.finish(result);
    return true;
  }

  finish(result) {
    this.gen++;
    this.engine.cancel();
    const { plies, userColor, persona, config, gameId } = this.s;
    const userPlies = plies.filter((p) => p.by === 'user' && typeof p.loss === 'number' && !p.drill);
    const accuracy = gameAccuracy(userPlies.map((p) => p.loss));
    const counts = {};
    for (const p of userPlies) counts[p.grade] = (counts[p.grade] || 0) + 1;
    const moments = plies
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.by === 'user' && (p.intervention || p.found || ['mistake', 'blunder'].includes(p.grade)))
      .map((p) => ({ ply: p.i, san: p.san, grade: p.grade, kind: p.intervention || (p.found ? 'found' : p.grade), why: p.why || '', best: p.best?.san || null, cardId: p.cardId || null }));
    const outcome = result.winner === null ? 'draw' : result.winner === userColor ? 'win' : 'loss';
    this.chess.setHeader('Result', result.winner === 'w' ? '1-0' : result.winner === 'b' ? '0-1' : '1/2-1/2');
    const summary = { accuracy, counts, moments, outcome, reason: result.reason, cards: plies.filter((p) => p.cardId).length };
    store.saveGame({
      id: gameId, date: Date.now(), persona: persona.name, personaId: persona.id, elo: config.elo, userColor,
      result: outcome, reason: result.reason, accuracy, counts, opening: this.s.opening?.name || null, pgn: this.chess.pgn(),
      plies: plies.map((p) => ({ san: p.san, uci: p.uci, by: p.by, fenBefore: p.fenBefore, grade: p.grade || null, loss: p.loss ?? null, best: p.best?.san || null, bestUci: p.best?.uci || null, why: p.why || null, scoreAfter: p.scoreAfter || null })),
      moments,
    });
    const title = outcome === 'win' ? 'You won' : outcome === 'loss' ? 'You lost' : 'Draw';
    this.set({ status: 'over', result, summary, active: null, thinking: false, grading: false, locked: false, turn: 'none' });
    this.feed({ tone: outcome === 'win' ? 'best' : 'info', title: `${title} — ${result.reason}`, text: accuracy != null ? `Accuracy ${accuracy}%. Open the review below to replay the key moments.` : 'Game over.' });
  }

  // ── your turn ───────────────────────────────────────────────────────────
  async userTurn() {
    if (this.checkEnd()) return;
    const gen = this.gen;
    const fen = this.chess.fen();
    const { userColor, plies, config } = this.s;
    const t = { gen, fen, thinkStart: Date.now(), hintsUsed: 0, moment: null, analysis: null, result: null, moved: false };
    t.rep = repertoireAt(fen, userColor, this.activeCourseIds);
    this.t = t;
    const fens = [config.fen || new Chess().fen(), ...plies.map((p) => p.fenAfter)];
    const opening = plies.length <= 30 ? openingOf(fens) || this.s.opening : this.s.opening;
    if (opening && opening.name !== this.s.opening?.name) {
      this.feed({ tone: 'opening', title: opening.name, text: opening.idea || '' });
    }
    this.set({ turn: 'user', thinking: false, grading: false, analysisReady: false, opening, active: null, arrows: [], marks: {} });

    // 1) Threat awareness. Runs first and briefly locks the board, so the question comes before the move.
    if (config.threatPrompts && config.coachMode !== 'exam' && plies.length > 1 && !this.chess.isCheck() && threatCheckApplies(plies[plies.length - 1])) {
      const nf = nullMoveFen(fen);
      if (nf) {
        this.set({ locked: true });
        const res = await this.engine.analyze(nf, { depth: THREAT_DEPTH, movetime: 800 });
        if (gen !== this.gen) return;
        this.set({ locked: false });
        const th = res?.lines[0] ? explainThreat(fen, res.lines[0].pv) : null;
        // Ask once per position per game (a take-back returns to positions already asked about).
        if (isRealThreat(th) && !this.threatsAsked.has(epd(fen)) && this.shouldAskThreat()) {
          this.threatsAsked.add(epd(fen));
          t.threat = th;
          this.set({ active: { kind: 'threat', state: 'asking', threat: th, color: opp(userColor) } });
        }
      }
    }

    // 2) The coach's analysis, while you think.
    t.analysis = this.engine.analyze(fen, { depth: COACH_DEPTH, multipv: 3, movetime: COACH_MOVETIME }).then((res) => {
      if (gen !== this.gen || !res) return res;
      t.result = res;
      this.onAnalysis(t);
      return res;
    });
  }

  shouldAskThreat() {
    const { streak } = store.getState().stats.threat;
    const p = streak >= 12 ? 0.25 : streak >= 6 ? 0.5 : 1;
    return this.rng() < p;
  }

  onAnalysis(t) {
    const lines = t.result.lines;
    if (!lines.length) return;
    this.set({ evalScore: { score: lines[0].score, turn: this.s.userColor }, analysisReady: true });
    // How good was the opponent's last move? (their loss = our gain since our last move)
    const plies = this.s.plies;
    const lastUser = [...plies].reverse().find((p) => p.by === 'user');
    const lastOpp = plies[plies.length - 1];
    let oppLoss = 0;
    if (lastUser && typeof lastUser.winAfter === 'number' && lastOpp?.by === 'opp') {
      oppLoss = winOf(lines[0].score) - lastUser.winAfter;
      const updated = [...plies];
      updated[plies.length - 1] = { ...lastOpp, loss: Math.max(0, oppLoss), grade: gradeFromLoss(Math.max(0, oppLoss)) };
      this.set({ plies: updated });
    }
    t.moment = detectMoment(t.fen, lines, oppLoss);
    if (t.moment && this.s.config.coachMode === 'guided' && !t.moved) {
      if (this.s.active?.kind === 'threat' && this.s.active.state === 'asking') t.pendingMoment = true;
      else this.announceMoment(t);
    }
  }

  announceMoment(t) {
    const m = MOMENT_TEXT[t.moment.type];
    this.set({ active: { kind: 'moment', type: t.moment.type, title: m.title, text: m.text, hintLevel: 0, hints: [] } });
  }

  answerThreat(square) {
    const a = this.s.active;
    if (a?.kind !== 'threat' || a.state !== 'asking') return;
    const correct = !!square && a.threat.squares.includes(square);
    store.recordThreatAnswer(correct);
    const mv = a.threat.move;
    this.set({
      active: { ...a, state: 'answered', correct, answer: square },
      arrows: [{ startSquare: mv.from, endSquare: mv.to, color: 'rgba(239,68,68,0.85)' }],
      marks: Object.fromEntries(a.threat.squares.map((s) => [s, 'threat'])),
    });
    this.feed({ tone: 'threat', title: correct ? 'Threat spotted ✓' : 'The threat', text: a.threat.text });
    if (this.t?.pendingMoment && this.t.moment && !this.t.moved) { this.t.pendingMoment = false; this.announceMoment(this.t); }
  }

  // ── moves ───────────────────────────────────────────────────────────────
  canMove() {
    const { status, turn, locked, grading, active } = this.s;
    if (status !== 'playing' || turn !== 'user' || locked || grading) return false;
    if (active?.kind === 'threat' && active.state === 'asking') return false;
    if (active?.kind === 'intervention' && active.mode === 'decide') return false;
    return true;
  }

  /** Called by the board. Returns true if the move was accepted onto the board. */
  userMove(from, to, promotion = 'q') {
    if (!this.canMove() || !this.t) return false;
    const fenBefore = this.chess.fen();
    let r;
    try { r = this.chess.move({ from, to, promotion }); } catch { r = null; }
    if (!r) return false;
    this.chess.undo();
    const uci = moveToUci(r);
    const a = this.s.active;
    if (a?.kind === 'drill') { this.drillMove(uci); return true; }
    if (a?.kind === 'intervention' && a.mode === 'retry') { this.retryMove(uci); return true; }
    this.t.moved = true;
    const ply = this.applyMove(uci, 'user', { thinkMs: Date.now() - this.t.thinkStart, hintsUsed: this.t.hintsUsed });
    this.set({ active: null, grading: true, arrows: [], marks: {} });
    this.grade(this.t, ply, fenBefore);
    return true;
  }

  applyMove(uci, by, extra = {}) {
    const fenBefore = this.chess.fen();
    let r = null;
    try { r = this.chess.move(uciToObj(uci)); } catch { r = null; }
    if (!r) throw new Error(`illegal move ${uci} in ${fenBefore}`);
    const ply = { san: r.san, uci, color: r.color, by, fenBefore, fenAfter: this.chess.fen(), ...extra };
    const plies = [...this.s.plies, ply];
    this.set({ plies, fen: this.chess.fen(), lastMove: { from: r.from, to: r.to } });
    return plies.length - 1;
  }

  patchPly(i, patch) {
    const plies = [...this.s.plies];
    plies[i] = { ...plies[i], ...patch };
    this.set({ plies });
  }

  async evalMove(t, uci) {
    const res = t.result || (await t.analysis);
    if (t.gen !== this.gen || !res?.lines.length) return null;
    const lines = res.lines;
    let line = lines.find((l) => l.pv[0] === uci);
    if (!line) {
      const r2 = await this.engine.analyze(t.fen, { depth: COACH_DEPTH, searchmoves: [uci], movetime: COACH_MOVETIME });
      if (t.gen !== this.gen || !r2?.lines.length) return null;
      line = r2.lines[0];
    }
    const winBest = winOf(lines[0].score);
    const winMove = winOf(line.score);
    const loss = Math.max(0, winBest - winMove);
    const ev = { lines, line, loss, winBest, winMove, grade: gradeFromLoss(loss, lines[0].pv[0] === uci) };
    return lines[0].pv[0] !== uci && loss > 0.03 && loss < 0.3 ? this.verifyMove(t, uci, ev) : ev;
  }

  /** Deeper head-to-head search of the played move against the engine's choice. */
  async verifyMove(t, uci, ev) {
    const bestUci = ev.lines[0].pv[0];
    const res = await this.engine.analyze(t.fen, { depth: VERIFY_DEPTH, multipv: 2, searchmoves: [bestUci, uci], movetime: VERIFY_MOVETIME });
    if (t.gen !== this.gen) return null;
    const top = res?.lines[0];
    const mine = res?.lines.find((l) => l.pv[0] === uci);
    if (!top || !mine) return ev;
    const lines = [top, ...ev.lines.filter((l) => l.pv[0] !== top.pv[0])];
    if (t.result) {
      t.result = { ...t.result, lines };
      if (top.pv[0] !== bestUci) { t.plan = null; t.planPromise = null; }
    }
    const winBest = winOf(top.score);
    const winMove = winOf(mine.score);
    const loss = Math.max(0, winBest - winMove);
    return { lines, line: mine, loss, winBest, winMove, grade: gradeFromLoss(loss, top.pv[0] === uci), verified: true };
  }

  async grade(t, plyIdx, fenBefore) {
    const ply = this.s.plies[plyIdx];
    const ev = await this.evalMove(t, ply.uci);
    if (!ev) return;
    const { lines, line, loss, winBest, winMove } = ev;
    let grade = ev.grade;
    const best = { uci: lines[0].pv[0], san: uciToSan(fenBefore, lines[0].pv[0]) };
    const inBook = loss <= 0.05 && bookMovesAt(fenBefore).some((m) => m.uci === ply.uci);
    if (inBook && plyIdx < 24) grade = 'book';
    this.patchPly(plyIdx, { grade, loss, winBefore: winBest, winAfter: winMove, scoreAfter: line.score, best, bestPv: lines[0].pv, movePv: line.pv });
    this.set({ grading: false, evalScore: { score: line.score, turn: this.s.userColor } });
    const mode = this.s.config.coachMode;
    const quiet = mode === 'exam'; // Exam mode: record everything, say nothing until the end.

    // Your repertoire.
    let repIssue = null;
    if (t.rep) {
      const card = store.getState().cards[t.rep.cardId];
      if (t.rep.move.uci === ply.uci) {
        this.patchPly(plyIdx, { grade: loss <= 0.08 ? 'book' : grade });
        if (card) store.reviewCard(card.id, autoRating({ correct: true, ms: ply.thinkMs, reps: card.sched?.reps || 0 }));
        if (!quiet) this.feed({ tone: 'book', title: `${ply.san} — ${t.rep.course.name}`, text: t.rep.move.note || 'Your repertoire move.' });
      } else if (card) {
        repIssue = { card, course: t.rep.course };
        store.reviewCard(card.id, Rating.Again);
      } else if (!quiet) {
        this.feed({ tone: 'info', title: 'Not in your prep yet', text: `Your ${t.rep.course.name} course plays ${t.rep.move.san} here. You haven’t learned that line yet — it’s waiting in the Openings tab.` });
      }
    }

    const m = t.moment;
    const missed = m && ['tactic', 'mate', 'punish'].includes(m.type) && loss >= 0.08;
    const bad = grade === 'mistake' || grade === 'blunder';
    if (mode !== 'exam' && (bad || missed || repIssue)) {
      this.intervene(t, plyIdx, { reason: repIssue ? 'repertoire' : missed ? 'missed' : grade, ev, repIssue });
      return;
    }
    if (bad || missed) {
      if (missed) store.recordMotif(m.motif, false);
      this.recordMistake(t, plyIdx, ev, missed ? 'missed' : grade, explainMistake({ fen: t.fen, uci: ply.uci, movePv: line.pv, winBefore: winBest, winAfter: winMove }));
    }

    if (m && loss < 0.05 && ['tactic', 'mate', 'punish', 'defend'].includes(m.type)) {
      if (quiet) {
        store.recordMotif(m.motif, true);
        this.patchPly(plyIdx, { found: m.type });
        this.makeCard(t, plyIdx, ev, 'tactic', Rating.Easy);
      } else {
        this.found(t, plyIdx, ev);
        return;
      }
    }
    if (mode !== 'exam' && grade === 'inaccuracy') {
      // Say what your move runs into, not just what the better move does.
      const cons = explainConsequence({ fen: fenBefore, movePv: line.pv, winAfter: winMove });
      const better = formatLine(fenBefore, [best.san]);
      if (cons?.telling) this.patchPly(plyIdx, { why: cons.text });
      const entry = this.feed({
        tone: 'inaccuracy', title: `${ply.san}?! Inaccuracy`,
        text: cons?.telling ? `${cons.text} Better was ${better}.` : `Playable, but ${better} was more precise.`,
        revealLabel: `What does ${best.san} do?`, reveal: describePlan(planSync(fenBefore, lines[0].pv), { userMove: ply.uci }),
      });
      this.planFor(t).then((plan) => { if (plan) this.updateFeed(entry.id, { reveal: describePlan(plan, { userMove: ply.uci }) }); });
    }
    this.oppTurn();
  }

  found(t, plyIdx, ev) {
    const m = t.moment;
    store.recordMotif(m.motif, true);
    const L = analyzeLine(t.fen, ev.line.pv, 12);
    const motifName = MOTIFS[m.motif]?.name;
    this.patchPly(plyIdx, { found: m.type });
    const guided = this.s.config.coachMode === 'guided';
    this.makeCard(t, plyIdx, ev, 'tactic', guided ? Rating.Good : Rating.Easy);
    const more = (L.mateIdx >= 0 ? L.mateIdx : L.keyIdx) >= 2;
    const title = m.type === 'defend' ? 'You found the only move' : m.type === 'mate' ? 'You found the mating attack' : `You found it${motifName ? ` — ${motifName.toLowerCase()}` : ''}`;
    this.feed({
      tone: 'best', title, text: more ? 'Now finish the job — play the combination through.' : describePlan(planSync(t.fen, ev.line.pv)),
      actions: m.type !== 'defend' ? practise(m.motif) : undefined,
    });
    if (more && m.type !== 'defend') this.startDrill(t, L);
    else this.oppTurn();
  }

  // ── interventions ───────────────────────────────────────────────────────
  intervene(t, plyIdx, { reason, ev, repIssue }) {
    const ply = this.s.plies[plyIdx];
    const ex = explainMistake({ fen: t.fen, uci: ply.uci, movePv: ev.line.pv, winBefore: ev.winBest, winAfter: ev.winMove });
    // "What happens next" follows the line until the material settles, so a piece you can win
    // straight back doesn't read like a piece lost.
    const cons = explainConsequence({ fen: t.fen, movePv: ev.line.pv, winAfter: ev.winMove });
    if (cons) ex.refutation = cons.summary;
    const T = COLOR_NAME[opp(this.s.userColor)];
    const alsoBad = ev.grade === 'mistake' || ev.grade === 'blunder';
    const lower = (x) => (x ? x[0].toLowerCase() + x.slice(1) : x);
    let title, why, reviewWhy;
    if (reason === 'repertoire') {
      title = `Not your ${repIssue.course.name} move`;
      why = `You’ve studied this position. Your repertoire plays something else — can you remember it?${alsoBad ? ` (Your move is also a real mistake: ${lower(ex.why)})` : ''}`;
      reviewWhy = `Your ${repIssue.course.name} repertoire plays ${t.rep.move.san} here.${alsoBad ? ` ${ex.why}` : ''}`;
    } else if (reason === 'missed') {
      const mt = t.moment.type;
      title = mt === 'mate' ? 'You missed a forced mate' : mt === 'punish' ? `You let ${T} off the hook` : 'You missed a tactic';
      why = mt === 'mate' ? 'There was a forced checkmate in this position.'
        : mt === 'punish' ? `${T}’s last move was a mistake, and there was a way to exploit it.`
          : 'There was a way to win material by force here.';
      if (alsoBad) why += ` Your move also has a problem: ${lower(ex.why)}`;
      store.recordMotif(t.moment.motif, false);
    } else {
      title = `${ply.san}${GRADES[reason].symbol} ${GRADES[reason].label}`;
      why = ex.why;
    }
    const cardType = reason === 'missed' ? 'tactic' : reason === 'repertoire' ? null : 'mistake';
    const cardId = cardType ? this.recordMistake(t, plyIdx, ev, reason, ex) : repIssue.card.id;
    const reply = ev.line.pv[1];
    this.patchPly(plyIdx, { intervention: reason, why: reviewWhy || why, cardId });
    this.set({
      turn: 'user',
      active: { kind: 'intervention', reason, title, why, refutation: reason === 'repertoire' ? '' : ex.refutation, mode: 'decide', attempts: 0, hintLevel: 0, plyIdx, cardId, motif: reason === 'missed' ? t.moment.motif : ex.motif?.type, retryNote: null },
      arrows: reply && reason !== 'repertoire' ? [{ startSquare: reply.slice(0, 2), endSquare: reply.slice(2, 4), color: 'rgba(239,68,68,0.85)' }] : [],
    });
  }

  recordMistake(t, plyIdx, ev, reason, ex) {
    const phase = gamePhase(new Chess(t.fen));
    store.recordPhaseMistake(phase);
    const rating = Rating.Again;
    return this.makeCard(t, plyIdx, ev, reason === 'missed' ? 'tactic' : 'mistake', rating, ex);
  }

  makeCard(t, plyIdx, ev, type, firstRating, ex = null) {
    const { lines } = ev;
    const ply = this.s.plies[plyIdx];
    const tol = type === 'tactic' ? 0.04 : 0.07;
    const wBest = winOf(lines[0].score);
    const answers = lines.filter((l) => wBest - winOf(l.score) <= tol).map((l) => l.pv[0]);
    const L = analyzeLine(t.fen, lines[0].pv, 12);
    const end = L.mateIdx >= 0 ? L.mateIdx : L.keyIdx;
    const id = `pos:${this.s.gameId}:${plyIdx}`;
    const prevOpp = this.s.plies[plyIdx - 1];
    store.upsertCard({
      id, type, fen: t.fen, answers, bestScore: lines[0].score,
      line: type === 'tactic' ? lines[0].pv.slice(0, end + 1) : [lines[0].pv[0]],
      motif: type === 'tactic' ? t.moment?.motif || L.motif?.type || 'material' : ex?.motif?.type || null,
      orientation: this.s.userColor === 'w' ? 'white' : 'black',
      lastMove: prevOpp ? { from: prevOpp.uci.slice(0, 2), to: prevOpp.uci.slice(2, 4) } : null,
      prompt: type === 'tactic' ? (t.moment?.type === 'mate' ? 'Find the forced mate.' : t.moment?.type === 'defend' ? 'Find the only move that holds.' : 'Find the winning continuation.') : 'Find a good move — you went wrong here before.',
      explanation: describePlan(planSync(t.fen, lines[0].pv)),
      source: { gameId: this.s.gameId, ply: plyIdx, opponent: this.s.persona.name, date: Date.now(), played: ply.san, why: ex?.why || null },
    });
    store.reviewCard(id, firstRating);
    this.patchPly(plyIdx, { cardId: id });
    // Refine the card's explanation with the threat analysis once it's available.
    if (lines[0].pv[0] === t.result?.lines[0]?.pv[0]) {
      this.planFor(t).then((plan) => { if (plan) store.upsertCard({ id, explanation: describePlan(plan) }); });
    }
    return id;
  }

  /** Intervention: take the move back and try again. */
  retry() {
    const a = this.s.active;
    if (a?.kind !== 'intervention' || a.mode !== 'decide') return;
    const plies = this.s.plies.slice(0, a.plyIdx);
    this.chess.undo();
    const last = plies[plies.length - 1];
    this.set({ plies, fen: this.chess.fen(), lastMove: last ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } : null, arrows: [], marks: {}, active: { ...a, mode: 'retry', attempts: a.attempts + 1, retryNote: null } });
  }

  async retryMove(uci) {
    const a = this.s.active;
    const t = this.t;
    const accept = a.reason === 'repertoire'
      ? async () => (uci === t.rep.move.uci ? { loss: 0 } : null)
      : async () => {
        const ev = await this.evalMove(t, uci);
        if (!ev) return undefined;
        const tol = a.reason === 'missed' ? 0.04 : 0.07;
        return ev.loss <= tol ? ev : { fail: ev };
      };
    this.set({ grading: true });
    const res = await accept();
    if (t.gen !== this.gen || res === undefined) return;
    this.set({ grading: false });
    const san = uciToSan(t.fen, uci);
    if (!res || res.fail) {
      let note = `${san} isn’t it either.`;
      if (res?.fail && a.reason !== 'repertoire') {
        const ex = explainMistake({ fen: t.fen, uci, movePv: res.fail.line.pv, winBefore: res.fail.winBest, winAfter: res.fail.winMove });
        note = res.fail.loss < 0.1 ? `${san} is playable, but there’s something stronger.` : `${san} doesn’t work: ${ex.why}`;
      }
      this.set({ active: { ...a, attempts: a.attempts + 1, retryNote: note } });
      return;
    }
    const rating = a.hintLevel >= 2 || a.attempts > 2 ? Rating.Again : Rating.Hard;
    if (a.cardId) store.reviewCard(a.cardId, rating, Date.now() + 1);
    this.t.moved = true;
    const plyIdx = this.applyMove(uci, 'user', { retried: true, thinkMs: 0 });
    const ev = res.loss === 0 && a.reason === 'repertoire' ? await this.evalMove(t, uci) : res;
    if (t.gen !== this.gen) return;
    if (ev?.line) this.patchPly(plyIdx, { grade: a.reason === 'repertoire' ? 'book' : ev.grade, loss: ev.loss, winAfter: ev.winMove, winBefore: ev.winBest, scoreAfter: ev.line.score, best: { uci: ev.lines[0].pv[0], san: uciToSan(t.fen, ev.lines[0].pv[0]) } });
    const explain = a.reason === 'repertoire' ? (t.rep.move.note || '') : ev?.line ? describePlan(planSync(t.fen, ev.line.pv)) : '';
    // When several moves were fine, say so: the lesson is the problem they all solve, not one magic move.
    const lines = t.result?.lines || [];
    const others = a.reason === 'repertoire' || !lines.length ? [] : lines
      .filter((l) => l.pv[0] !== uci && winOf(lines[0].score) - winOf(l.score) <= 0.05)
      .map((l) => formatLine(t.fen, [uciToSan(t.fen, l.pv[0])]));
    const also = others.length ? ` Also good here: ${others.join(', ')}.` : '';
    this.set({ active: null, arrows: [] });
    const entry = this.feed({ tone: 'best', title: `${san} — that’s it`, text: explain + also, actions: a.reason === 'missed' ? practise(a.motif) : undefined });
    if (a.reason !== 'repertoire' && ev?.line) {
      planOf(this.engine, t.fen, ev.line.pv, { opponentThreat: true }).then((plan) => {
        if (plan) this.updateFeed(entry.id, { text: describePlan(plan) + also });
      });
    }
    if (a.reason === 'missed' && ev?.line) {
      const L = analyzeLine(t.fen, ev.line.pv, 12);
      if ((L.mateIdx >= 0 ? L.mateIdx : L.keyIdx) >= 2) { this.startDrill(t, L); return; }
    }
    this.oppTurn();
  }

  /** Intervention: reveal the answer and play it. */
  async showMe() {
    const a = this.s.active;
    if (a?.kind !== 'intervention') return;
    const t = this.t;
    if (a.mode === 'decide') { this.chess.undo(); this.set({ plies: this.s.plies.slice(0, a.plyIdx) }); }
    if (a.cardId && a.reason !== 'repertoire') store.reviewCard(a.cardId, Rating.Again, Date.now() + 1);
    const res = t.result || (await t.analysis);
    if (t.gen !== this.gen || !res) return;
    const shown = a.reason === 'repertoire' ? null : await this.planFor(t);
    if (t.gen !== this.gen) return;
    const pv = a.reason === 'repertoire' ? null : shown?.L.steps.length ? shown.L.steps.map((s) => s.uci) : res.lines[0].pv;
    const uci = a.reason === 'repertoire' ? t.rep.move.uci : pv[0];
    const plyIdx = this.applyMove(uci, 'user', { revealed: true, thinkMs: 0 });
    const san = this.s.plies[plyIdx].san;
    const ev = await this.evalMove(t, uci);
    if (t.gen !== this.gen) return;
    if (ev) this.patchPly(plyIdx, { grade: ev.grade, loss: ev.loss, winAfter: ev.winMove, winBefore: ev.winBest, scoreAfter: ev.line.score, best: { uci, san } });
    this.set({ active: null, arrows: [] });
    const plan = a.reason === 'repertoire' ? null : await this.planFor(t);
    if (t.gen !== this.gen) return;
    const text = a.reason === 'repertoire' ? (t.rep.move.note || 'Your repertoire move.') : describePlan(plan || planSync(t.fen, pv));
    this.feed({ tone: 'tactic', title: `The move was ${san}`, text, actions: a.reason === 'missed' ? practise(a.motif) : undefined });
    if (a.reason === 'missed' && pv) {
      const L = analyzeLine(t.fen, pv, 12);
      if ((L.mateIdx >= 0 ? L.mateIdx : L.keyIdx) >= 2) { this.startDrill(t, L, 'Your turn: finish it.'); return; }
    }
    this.oppTurn();
  }

  /** Intervention: keep the move and continue. */
  playOn() {
    const a = this.s.active;
    if (a?.kind !== 'intervention' || a.mode !== 'decide') return;
    this.set({ active: null, arrows: [] });
    this.feed({ tone: 'info', title: 'Playing on', text: a.reason === 'repertoire' ? 'Noted — this position is back in your review queue.' : 'Saved to your review deck. Let’s see how it goes.' });
    this.oppTurn();
  }

  /** What the best move here is about (threat, defence, payoff). Computed once per position, on demand. */
  async planFor(t) {
    if (t.plan) return t.plan;
    let best = t.result?.lines[0]?.pv;
    if (!best) return null;
    // In your repertoire, hints and answers lead to your repertoire move.
    const rep = t.rep?.move.uci;
    if (rep && rep !== best[0] && !t.planPromise) {
      t.planPromise = this.engine.analyze(t.fen, { depth: 14, searchmoves: [rep], movetime: 3000 })
        .then((r) => planOf(this.engine, t.fen, r?.lines[0]?.pv || [rep], { opponentThreat: !t.threat }));
    }
    t.planPromise = t.planPromise || planOf(this.engine, t.fen, best, { opponentThreat: !t.threat });
    const plan = await t.planPromise;
    if (plan && t.threat && !plan.oppThreat) plan.oppThreat = t.threat;
    t.plan = plan;
    return plan;
  }

  /**
   * Hint ladder: 1) the target or goal, never the move; 2) which piece; 3) the move and
   * the whole idea behind it.
   */
  async hint() {
    const a = this.s.active;
    const t = this.t;
    if (!t || this.s.hintPending) return;
    if (a?.kind === 'drill') {
      const step = a.L.steps[a.idx];
      this.set({ active: { ...a, hintLevel: (a.hintLevel || 0) + 1 }, arrows: [{ startSquare: step.from, endSquare: step.to, color: 'rgba(34,197,94,0.85)' }] });
      return;
    }
    if (!t.result?.lines[0]) return;
    const level = Math.min(3, (a?.hintLevel || 0) + 1);
    t.hintsUsed++;
    if (a?.kind === 'intervention' && a.reason === 'repertoire') {
      const u = t.rep.move.uci;
      const hintText = level === 1 ? `It starts with your ${pieceName(t.fen, u)}.` : `It’s ${t.rep.move.san}. ${t.rep.move.note || ''}`.trim();
      this.set({ active: { ...a, hintLevel: level, hintText }, marks: { [u.slice(0, 2)]: 'hint' }, arrows: level >= 2 ? [{ startSquare: u.slice(0, 2), endSquare: u.slice(2, 4), color: 'rgba(34,197,94,0.85)' }] : [] });
      return;
    }
    // The theme hint describes the *solution*. For a missed tactic that's the tactic's
    // motif; after an ordinary mistake, a.motif describes the refutation, so don't use it.
    const motif = a?.kind === 'intervention' ? (a.reason === 'missed' ? a.motif : null) : t.moment?.motif;
    this.set({ hintPending: true });
    const plan = await this.planFor(t);
    if (t !== this.t || t.gen !== this.gen) return;
    this.set({ hintPending: false });
    if (!plan) return;
    const h = planHints(plan, { motif })[level - 1];
    const cur = this.s.active;
    const patch = { hintLevel: level, hintText: h.text };
    if (!cur || cur.kind === 'threat') this.set({ active: { kind: 'moment', type: 'hint', title: 'Hint', text: '', ...patch }, marks: h.marks, arrows: h.arrows });
    else this.set({ active: { ...cur, ...patch }, marks: h.marks, arrows: h.arrows });
  }

  // ── playing a combination to the end ────────────────────────────────────
  startDrill(t, L, text = 'Keep going — finish the combination.') {
    const end = L.mateIdx >= 0 ? L.mateIdx : L.keyIdx;
    this.set({ active: { kind: 'drill', L, idx: 1, end, text, attempts: 0, hintLevel: 0, startPly: this.s.plies.length - 1 } });
    this.drillOpponent();
  }

  async drillOpponent() {
    const gen = this.gen;
    const a = this.s.active;
    const step = a.L.steps[a.idx];
    this.set({ turn: 'opp', thinking: true });
    await this.wait(this.oppDelay);
    if (gen !== this.gen) return;
    this.applyMove(step.uci, 'opp', { source: 'drill', drill: true });
    if (this.checkEnd()) return;
    const next = { ...this.s.active, idx: a.idx + 1, attempts: 0, hintLevel: 0 };
    this.t = { gen, fen: this.chess.fen(), thinkStart: Date.now(), hintsUsed: 0, moment: null, result: null, analysis: null, moved: false };
    this.set({ active: next, turn: 'user', thinking: false, arrows: [] });
  }

  async drillMove(uci) {
    const a = this.s.active;
    const step = a.L.steps[a.idx];
    const gen = this.gen;
    let ok = uci === step.uci;
    let newPv = null;
    if (!ok) {
      // Accept an equally good alternative.
      this.set({ grading: true });
      const fen = this.chess.fen();
      const bestRes = await this.engine.analyze(fen, { depth: 12, movetime: 1500 });
      const mine = bestRes ? await this.engine.analyze(fen, { depth: 12, searchmoves: [uci], movetime: 1500 }) : null;
      if (gen !== this.gen) return;
      this.set({ grading: false });
      if (bestRes?.lines[0] && mine?.lines[0]) {
        const wb = winOf(bestRes.lines[0].score), wm = winOf(mine.lines[0].score);
        if (wb - wm <= 0.03 && wm >= 0.8) { ok = true; newPv = mine.lines[0].pv; }
      }
    }
    if (!ok) {
      const tries = a.attempts + 1;
      this.set({ active: { ...a, attempts: tries, text: tries >= 2 ? 'Not that. Use a hint if you’re stuck.' : `${uciToSan(this.chess.fen(), uci)} lets them off. Keep the pressure on.` } });
      return;
    }
    const fen = this.chess.fen();
    this.applyMove(uci, 'user', { drill: true, grade: 'best', loss: 0 });
    if (this.checkEnd()) return;
    let L = a.L, idx = a.idx + 1, end = a.end;
    if (newPv) {
      L = analyzeLine(fen, newPv, 12);
      idx = 1;
      end = L.mateIdx >= 0 ? L.mateIdx : L.keyIdx;
    }
    if (idx > end || !L.steps[idx]) {
      this.set({ active: null, arrows: [] });
      this.feed({ tone: 'best', title: 'Combination complete', text: L.mateIdx >= 0 ? 'Checkmate is coming — well played.' : `You’ve banked the advantage. ${capitalize(describeQuietMove(fen, uci))}.` });
      this.oppTurn();
      return;
    }
    this.set({ active: { ...a, L, idx, end, attempts: 0, hintLevel: 0, text: 'Good. Keep going.' } });
    this.drillOpponent();
  }

  // ── opponent ────────────────────────────────────────────────────────────
  async oppTurn() {
    if (this.checkEnd()) return;
    const gen = this.gen;
    const fen = this.chess.fen();
    this.set({ turn: 'opp', thinking: true });
    const { persona, config, userColor, plies } = this.s;
    const [choice] = await Promise.all([
      chooseMove(this.engine, fen, { persona, elo: config.elo, ply: plies.length, learnerColor: userColor, activeCourseIds: this.activeCourseIds, cards: store.getState().cards, rng: this.rng }),
      this.wait(this.oppDelay),
    ]);
    if (gen !== this.gen || !choice) return;
    // Did they leave your preparation?
    const prepNote = this.prepCheck(fen, choice.uci);
    this.applyMove(choice.uci, 'opp', { source: choice.source, bookName: choice.name });
    this.set({ thinking: false });
    if (prepNote) this.feed(prepNote);
    if (this.checkEnd()) return;
    this.userTurn();
  }

  prepCheck(fen, uci) {
    if (this.s.config.coachMode === 'exam') return null;
    const key = epd(fen);
    for (const c of COURSES) {
      if (c.learner !== this.s.userColor || !this.activeCourseIds.includes(c.id)) continue;
      const node = c.nodes.get(key);
      if (!node || node.learnerToMove) continue;
      if (node.moves.has(uci)) return null;
      const san = uciToSan(fen, uci);
      return { tone: 'info', title: `Out of your prep: ${prose(opp(this.s.userColor), san)}`, text: `Your ${c.name} course doesn’t cover this. You’re on your own now — develop, castle, contest the centre, and check what the new move threatens.` };
    }
    return null;
  }
}

function pieceName(fen, uci) {
  const p = new Chess(fen).get(uci.slice(0, 2));
  return p ? { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[p.type] : 'pieces';
}


export { formatLine };
