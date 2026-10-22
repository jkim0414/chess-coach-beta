// Explanations and hints, checked on a real position reported from play (move 12, White to move).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNodeEngine } from './nodeWorker.js';
import { planOf, describePlan, planHints } from '../src/lib/plan.js';
import { motifsOfMove } from '../src/lib/tactics.js';
import { describeQuietMove } from '../src/lib/explain.js';
import { GameController, threatCheckApplies, isRealThreat } from '../src/play/controller.js';
import { explainThreat, explainConsequence } from '../src/lib/explain.js';
import { winOf } from '../src/lib/evaluation.js';
import { nullMoveFen } from '../src/lib/chessutil.js';
import * as store from '../src/lib/store.js';

const FEN = 'r1b2rk1/1pppnpp1/3q3p/p1b1p1BQ/2BnP2N/2NPR3/PPP2PPP/5RK1 w - - 0 12';
let engine;
beforeAll(() => { engine = createNodeEngine(); });
afterAll(() => engine.terminate());
beforeEach(() => store.__setState(store.freshState()));

async function planFor(firstUci) {
  const r = await engine.analyze(FEN, { depth: 16, searchmoves: [firstUci], movetime: 20000 });
  return planOf(engine, FEN, r.lines[0].pv, { opponentThreat: true });
}

describe('plan explanations', () => {
  it('explains 12.Rg3 by its threat and why the threat works, not by a later capture out of context', async () => {
    const plan = await planFor('e3g3');
    const text = describePlan(plan, { userMove: 'g5e7' });
    expect(text).toMatch(/^12\.Rg3 threatens Bxh6/);
    expect(text).toMatch(/pawn on g7 couldn’t take back.*rook on g3 would pin it to the king/);
    expect(text).toMatch(/best answer is 12\.\.\./);
    expect(text).toMatch(/Your 12\.Bxe7 trades off the bishop that makes that threat work/);
    expect(text).not.toMatch(/simply undefended/);
  }, 60000);

  it('builds hints that go target → piece → move + idea', async () => {
    const plan = await planFor('e3g3');
    const [h1, h2, h3] = planHints(plan);
    expect(h1.text).toMatch(/h6/);
    expect(h1.text).not.toMatch(/Rg3|rook/);
    expect(h1.marks).toEqual({ h6: 'target' });
    expect(h2.text).toMatch(/rook on e3/);
    expect(h3.text).toMatch(/Rg3 threatens Bxh6/);
    expect(h3.arrows[0]).toMatchObject({ startSquare: 'e3', endSquare: 'g3' });
  }, 60000);

  it('does not call Bxe7 a skewer (the queen just takes back) and describes it as the trade it is', () => {
    expect(motifsOfMove(FEN, 'g5e7').map((m) => m.type)).not.toContain('skewer');
    expect(describeQuietMove(FEN, 'g5e7')).toMatch(/^trades your bishop for the knight on e7/);
  });
});

describe('grading near-equal moves', () => {
  it('does not flag 12.Bxe7 as an inaccuracy (deeper re-check)', async () => {
    const c = new GameController({ engine, oppDelay: 0, rng: () => 0.3 });
    c.start({ personaId: 'classicist', elo: 1500, userColor: 'white', coachMode: 'coach', threatPrompts: false, fen: FEN });
    const wait = (pred) => new Promise((res) => { const un = c.subscribe(() => { if (pred(c.getState())) { un(); res(c.getState()); } }); });
    await wait((s) => s.analysisReady);
    c.userMove('g5', 'e7');
    const s = await wait((st) => st.plies.length === 2 && st.turn === 'user');
    expect(['best', 'excellent', 'good']).toContain(s.plies[0].grade);
    expect(s.feed.some((f) => f.tone === 'inaccuracy')).toBe(false);
  }, 60000);
});

describe('threat check', () => {
  // Reported from play: after 15...Bxc4 the coach asked "what is Black threatening?" and
  // answered "…Be6, winning the exchange or two pawns" — but the move was just to take back.
  const AFTER_BXC4 = 'r2q1rk1/bpp2pp1/p1np1n1p/4p3/PPb1P3/2PP1NNP/3B1PP1/R2QR1K1 w - - 0 16';

  it('is skipped right after the opponent captures (the question is whether to take back)', () => {
    expect(threatCheckApplies({ by: 'opp', san: 'Bxc4' })).toBe(false);
    expect(threatCheckApplies({ by: 'opp', san: 'Ba5' })).toBe(true);
  });

  it('only counts direct threats: a capture or mate next move', async () => {
    const res = await engine.analyze(nullMoveFen(AFTER_BXC4), { depth: 10 });
    const th = explainThreat(AFTER_BXC4, res.lines[0].pv);
    expect(isRealThreat(th)).toBe(false);
    expect(isRealThreat({ mate: false, gain: 3, move: { captured: null } })).toBe(false);
    expect(isRealThreat({ mate: false, gain: 3, move: { captured: 'n' } })).toBe(true);
    expect(isRealThreat({ mate: true, gain: 99, move: { captured: null } })).toBe(true);
  }, 60000);
});

describe('what your move runs into', () => {
  // Reported from play: 12.Nxd4 was called an inaccuracy, but the note only described
  // 12.d3 — not that the knight on d4 hangs to the queen down the open d-file.
  const BEFORE_NXD4 = 'r2qkb1r/pp3ppp/2p1b3/8/1n1p4/5B2/PPPPNPPP/R1BQ1RK1 w kq - 0 12';

  it('explains that the "free" pawn isn’t free', async () => {
    const r = await engine.analyze(BEFORE_NXD4, { depth: 18, searchmoves: ['e2d4'], movetime: 20000 });
    const c = explainConsequence({ fen: BEFORE_NXD4, movePv: r.lines[0].pv, winAfter: winOf(r.lines[0].score) });
    expect(c.text).toMatch(/^Black answers 12\.\.\.Qxd4, taking the knight on d4 — nothing defends it\./);
    expect(c.text).toMatch(/material is level — the pawn wasn’t really free/);
    expect(c.telling).toBe(true);
  }, 60000);

  it('names the trade for outright losses', async () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const r = await engine.analyze(fen, { depth: 14, searchmoves: ['f3e5'] });
    const c = explainConsequence({ fen, movePv: r.lines[0].pv, winAfter: winOf(r.lines[0].score) });
    expect(c.summary).toBe('Black 3...Nxe5: you’ve given a knight for a pawn');
  }, 60000);
});

