// Explanations and hints, checked on a real position reported from play (move 12, White to move).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNodeEngine } from './nodeWorker.js';
import { planOf, describePlan, planHints } from '../src/lib/plan.js';
import { motifsOfMove } from '../src/lib/tactics.js';
import { describeQuietMove } from '../src/lib/explain.js';
import { GameController } from '../src/play/controller.js';
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
