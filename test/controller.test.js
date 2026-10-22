// End-to-end: the real game controller against the real (WASM) Stockfish.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GameController } from '../src/play/controller.js';
import { createNodeEngine } from './nodeWorker.js';
import * as store from '../src/lib/store.js';

let engine;
beforeAll(() => { engine = createNodeEngine(); });
afterAll(() => engine.terminate());
beforeEach(() => store.__setState(store.freshState()));

function waitFor(ctrl, pred, ms = 30000) {
  return new Promise((resolve, reject) => {
    if (pred(ctrl.getState())) return resolve(ctrl.getState());
    const timer = setTimeout(() => { un(); reject(new Error('timed out; state: ' + JSON.stringify({ active: ctrl.getState().active?.kind, turn: ctrl.getState().turn, status: ctrl.getState().status }))); }, ms);
    const un = ctrl.subscribe(() => {
      if (pred(ctrl.getState())) { clearTimeout(timer); un(); resolve(ctrl.getState()); }
    });
  });
}

const config = (extra) => ({ personaId: 'classicist', elo: 1500, userColor: 'white', coachMode: 'coach', threatPrompts: false, ...extra });
const move = (c, uci) => c.userMove(uci.slice(0, 2), uci.slice(2, 4), uci[4]);

describe('GameController', () => {
  it('stops you after a missed mate, and accepts the mate on retry', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    // Scholar's-mate position: Qxf7# is on.
    c.start(config({ fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' }));
    await waitFor(c, (s) => s.analysisReady);
    expect(move(c, 'b1c3')).toBe(true);
    const s = await waitFor(c, (st) => st.active?.kind === 'intervention');
    expect(s.active.reason).toBe('missed');
    expect(s.active.title).toMatch(/mate/i);
    // the card was created and is due again soon
    const card = store.getState().cards[s.active.cardId];
    expect(card.type).toBe('tactic');
    expect(card.answers).toContain('h5f7');

    c.retry();
    expect(c.getState().active.mode).toBe('retry');
    expect(move(c, 'h5f7')).toBe(true);
    const done = await waitFor(c, (st) => st.status === 'over');
    expect(done.result.reason).toBe('checkmate');
    expect(done.result.winner).toBe('w');
  }, 60000);

  it('explains a hanging-queen blunder without revealing the better move', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start(config({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR w KQkq - 0 2' }));
    await waitFor(c, (s) => s.analysisReady);
    move(c, 'f3f7');
    const s = await waitFor(c, (st) => st.active?.kind === 'intervention');
    expect(s.active.reason).toBe('blunder');
    expect(s.active.why).toMatch(/queen on f7/);
    expect(s.active.refutation).toMatch(/Kxf7/);
    // "play on" keeps the blunder and the opponent takes the queen
    c.playOn();
    const after = await waitFor(c, (st) => st.turn === 'user' && st.plies.length === 2);
    expect(after.plies[1].san).toBe('Kxf7');
  }, 60000);

  it('takes back to your previous move without engine races', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start(config());
    await waitFor(c, (s) => s.turn === 'user');
    move(c, 'e2e4');
    await waitFor(c, (s) => s.plies.length === 2 && s.turn === 'user');
    c.takeBack();
    const s = c.getState();
    expect(s.plies.length).toBe(0);
    expect(s.turn).toBe('user');
    // no stray "AI move" arrives after the take-back
    await new Promise((r) => setTimeout(r, 1500));
    expect(c.getState().plies.length).toBe(0);
  }, 60000);

  it('records the opponent’s first move when you play Black (old history bug)', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start(config({ userColor: 'black' }));
    const s = await waitFor(c, (st) => st.turn === 'user' && st.plies.length === 1);
    expect(s.plies[0].by).toBe('opp');
    expect(s.plies[0].color).toBe('w');
  }, 60000);

  it('asks "what is the threat?" when the opponent creates one, and locks the board until answered', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    // After a quiet 1.h3, Black's best is ...e4, forking the d3 bishop and f3 knight.
    c.start(config({ fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/8/3B1N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', threatPrompts: true, elo: 2400 }));
    await waitFor(c, (s) => s.analysisReady);
    move(c, 'h2h3');
    // h3 already allows the fork, so the coach stops us first; keep the move.
    await waitFor(c, (st) => st.active?.kind === 'intervention');
    expect(c.getState().active.why).toMatch(/tactic|fork|loose|protection|safe/i);
    c.playOn();
    const s = await waitFor(c, (st) => st.active?.kind === 'threat');
    expect(s.plies[1].san).toBe('e4');
    expect(s.active.state).toBe('asking');
    expect(c.canMove()).toBe(false);
    expect(s.active.threat.squares).toEqual(expect.arrayContaining(['d3', 'f3']));
    expect(s.active.threat.text).toMatch(/pawn on e4 attacks your (bishop on d3|knight on f3) and your (bishop on d3|knight on f3)/);
    c.answerThreat('f3');
    expect(c.getState().active.correct).toBe(true);
    expect(store.getState().stats.threat).toMatchObject({ asked: 1, correct: 1 });
    expect(c.canMove()).toBe(true);
  }, 60000);

  it('stays silent in Exam mode but still turns the missed mate into a review card', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start(config({ coachMode: 'exam', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' }));
    await waitFor(c, (s) => s.analysisReady);
    move(c, 'b1c3');
    const s = await waitFor(c, (st) => st.plies.length === 2 && st.turn === 'user');
    expect(s.active).toBeNull();
    expect(s.feed.filter((f) => f.tone !== 'info' && f.tone !== 'opening')).toHaveLength(0);
    const cards = Object.values(store.getState().cards);
    expect(cards.some((cd) => cd.type === 'tactic' && cd.answers.includes('h5f7'))).toBe(true);
    expect(store.getState().stats.motifs.mate?.found ?? 0).toBe(0);
  }, 60000);

  it('announces critical moments in Guided mode, with a hint ladder that ends in the move', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start(config({ coachMode: 'guided', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' }));
    const s = await waitFor(c, (st) => st.active?.kind === 'moment');
    expect(s.active.type).toBe('mate');
    c.hint();
    expect(c.getState().active.hintText).toMatch(/check/i);
    c.hint();
    expect(c.getState().marks).toEqual({ h5: 'hint' });
    c.hint();
    expect(c.getState().arrows[0]).toMatchObject({ startSquare: 'h5', endSquare: 'f7' });
  }, 60000);
});

