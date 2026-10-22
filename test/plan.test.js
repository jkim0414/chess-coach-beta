// Explanations and hints, checked on a real position reported from play (move 12, White to move).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNodeEngine } from './nodeWorker.js';
import { planOf, planSync, describePlan, planHints } from '../src/lib/plan.js';
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
    expect(c.text).not.toMatch(/\b(White|Black) \d/);
    expect(c.telling).toBe(true);
  }, 60000);

  it('names the trade for outright losses', async () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const r = await engine.analyze(fen, { depth: 14, searchmoves: ['f3e5'] });
    const c = explainConsequence({ fen, movePv: r.lines[0].pv, winAfter: winOf(r.lines[0].score) });
    expect(c.summary).toBe('3...Nxe5: you’ve given a knight for a pawn');
  }, 60000);
});

describe('threats and reasons must be caused by the line', () => {
  // Reported from play: "29.d6 threatens bxa4, winning about two pawns" — bxa4 was available
  // before d6 — and "after 29...Rd8 the rook no longer guards d8" (the rook moved *to* d8).
  const BEFORE_D6 = 'r4qkr/5pp1/1p5p/3P1B2/p1PB4/1P3Q2/P4PPP/3RR1K1 w - - 0 29';

  it('does not credit a move with a capture that was already available', async () => {
    // A fake engine that answers the "what if they passed?" search with bxa4, as the browser did.
    const fake = { analyze: async () => ({ lines: [{ pv: ['b3a4', 'a8a4', 'f5c8'], score: { type: 'cp', value: 900 } }] }) };
    const plan = await planOf(fake, BEFORE_D6, ['d5d6', 'a8d8', 'd4b6', 'g7g6', 'b6d8']);
    expect(plan.threat).toBeNull();
    const text = describePlan(plan);
    expect(text).toMatch(/^29\.d6 pushes the passed pawn to d6\./);
    expect(text).not.toMatch(/threatens/);
  });

  it('does not call the captured piece a defender that left, nor say "but" when nothing changed', () => {
    const text = describePlan(planSync(BEFORE_D6, ['d5d6', 'a8d8', 'd4b6', 'g7g6', 'b6d8']));
    expect(text).not.toMatch(/no longer guards d8/);
    expect(text).toMatch(/best answer is 29\.\.\.Rd8, and then 30\.Bxb6 wins the pawn on b6 \(nothing defends b6\)/);
  });

  it('describes quiet piece moves by what they do', () => {
    const fen = 'r1bq1rk1/pp3ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 9';
    expect(describeQuietMove(fen, 'f3d2')).toBe('puts the knight on d2, where it protects the pawn on e4');
  });
});

describe('mates belong to the side that gives them', () => {
  // Reported from play: "Black threatens mate: 36...f5 37.Re7+ ... 40.Qxg5#" — the mate in
  // that line was White's (the player's own), found while asking what Black threatens.
  const WON = '4Q3/B4p1k/6p1/7p/p1P5/1P3Q2/P4PPP/3RR1K1 w - - 0 36';

  it('does not report the player’s own mate as the opponent’s threat', async () => {
    const res = await engine.analyze(nullMoveFen(WON), { depth: 12 });
    const th = explainThreat(WON, res.lines[0].pv);
    expect(th?.mate ?? false).toBe(false);
    expect(isRealThreat(th)).toBe(false);
  }, 60000);

  it('scores a line where the other side mates as a loss', async () => {
    const { analyzeLine } = await import('../src/lib/tactics.js');
    // The line from the report: 36...f5 37.Re7+ Kh6 38.Be3+ f4 39.Qxf4+ g5 40.Qxg5#
    const L = analyzeLine(nullMoveFen(WON), ['f7f5', 'e1e7', 'h7h6', 'a7e3', 'f5f4', 'f3f4', 'g6g5', 'f4g5']);
    expect(L.steps).toHaveLength(8);
    expect(L.steps[7].mate).toBe(true);
    expect(L.mateIdx).toBe(-1);
    expect(L.gain).toBeLessThan(0);
  });
});

