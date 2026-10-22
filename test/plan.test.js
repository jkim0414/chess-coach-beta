// Explanations and hints, checked on a real position reported from play (move 12, White to move).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNodeEngine } from './nodeWorker.js';
import { planOf, planSync, describePlan, planHints } from '../src/lib/plan.js';
import { motifsOfMove, hangingPieces, boardOf } from '../src/lib/tactics.js';
import { describeQuietMove } from '../src/lib/explain.js';
import { GameController, threatCheckApplies, isRealThreat, confirmThreat } from '../src/play/controller.js';
import { explainThreat, explainConsequence, explainMistake, naiveRecapture, recaptureNote } from '../src/lib/explain.js';
import { winOf } from '../src/lib/evaluation.js';
import { contrastMoves } from '../src/lib/contrast.js';
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

describe('threat wording', () => {
  // Reported from play: the rook on h7 attacked the queen on g7, the player clicked g7
  // (correct), but the note described "...Bxf2+: forks the king and the rook" — the engine's
  // in-between check — instead of the plain threat ...Rxg7.
  const QUEEN_ATTACKED = '4k3/1pp3Qr/rbn2P2/p2Pp3/8/2PP4/PP3PP1/RNB1R1K1 w - - 0 20';

  it('names the simple threat to a hanging piece first', async () => {
    const res = await engine.analyze(nullMoveFen(QUEEN_ATTACKED), { depth: 12 });
    const th = explainThreat(QUEEN_ATTACKED, res.lines[0].pv);
    expect(th.text).toBe('Black’s rook on h7 attacks your queen on g7 — …Rxg7 would cost you the queen for a rook.');
    expect(th.move).toMatchObject({ from: 'h7', to: 'g7' });
    expect(th.squares).toEqual(expect.arrayContaining(['g7', 'h7']));
    expect(isRealThreat(th)).toBe(true);
  }, 60000);
});

describe('positional mistakes', () => {
  // Reported from play: "you go from about equal to about equal" for 9.Re1, which lets
  // ...Nxc4 double your pawns and hand Black the bishop pair.
  const BEFORE_RE1 = 'r1bq1rk1/ppp2ppp/1nn5/2b1p3/2B5/2PP1N1P/PP3PP1/RNBQ1RK1 w - - 1 9';

  it('names the concrete positional cost and the evaluation change', async () => {
    const fresh = createNodeEngine(); // a fresh hash keeps the engine's line reproducible
    const best = await fresh.analyze(BEFORE_RE1, { depth: 16 });
    const mine = await fresh.analyze(BEFORE_RE1, { depth: 16, searchmoves: ['f1e1'] });
    fresh.terminate();
    const ex = explainMistake({ fen: BEFORE_RE1, uci: 'f1e1', movePv: mine.lines[0].pv, winBefore: winOf(best.lines[0].score), winAfter: winOf(mine.lines[0].score) });
    expect(ex.why).toMatch(/^It doesn’t lose material, but after 9\.\.\.Nxc4 10\.dxc4/);
    expect(ex.why).toMatch(/doubled on the c-file/);
    expect(ex.why).toMatch(/Black gets the bishop pair/);
    expect(ex.why).toMatch(/evaluation goes from [+−]?\d\.\d to −\d\.\d/);
    expect(ex.why).not.toMatch(/about equal to about equal/);
  }, 60000);
});

describe('pins', () => {
  it('does not call it a pin when the pinned piece can take the pinner', async () => {
    const { motifsOfMove } = await import('../src/lib/tactics.js');
    const { playLine } = await import('../src/lib/chessutil.js');
    // 9.Re1 Nxc4 10.dxc4 — now ...Qxd1 "pins" the e1 rook, which just takes the queen.
    const steps = playLine('r1bq1rk1/ppp2ppp/1nn5/2b1p3/2B5/2PP1N1P/PP3PP1/RNBQ1RK1 w - - 1 9', ['f1e1', 'b6c4', 'd3c4']);
    expect(steps).toHaveLength(3);
    const fen = steps[2].fenAfter;
    const ms = motifsOfMove(fen, 'd8d1');
    expect(ms.length).toBeGreaterThanOrEqual(0);
    expect(ms.map((m) => m.type)).not.toContain('pin');
    // …while a real pin is still found (Bb5 pinning the c6 knight to the king).
    expect(motifsOfMove('r1bqkbnr/ppp2ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', 'f1b5').map((m) => m.type)).toContain('pin');
  });
});

describe('winning positions', () => {
  // Reported from play: 30.Qe4+ (the b7-bishop takes the queen) was explained as "attacked 1×
  // and defended only 1×", and the hint claimed 30.Rae1 "takes care of the threat" to the g3
  // bishop although Black takes it.
  const BEFORE_QE4 = '8/PbpqNr1k/7p/4Q1p1/1P3p2/2P3B1/P3RPPP/R5K1 w - - 0 30';

  it('explains a piece lost to a cheaper attacker', async () => {
    const fresh = createNodeEngine();
    const b = await fresh.analyze(BEFORE_QE4, { depth: 14 });
    const q = await fresh.analyze(BEFORE_QE4, { depth: 14, searchmoves: ['e5e4'] });
    fresh.terminate();
    const ex = explainMistake({ fen: BEFORE_QE4, uci: 'e5e4', movePv: q.lines[0].pv, winBefore: winOf(b.lines[0].score), winAfter: winOf(q.lines[0].score) });
    expect(ex.why).toBe('Your queen on e4 isn’t safe there — the bishop on b7 can take it, and taking back only wins a bishop.');
    const c = explainConsequence({ fen: BEFORE_QE4, movePv: q.lines[0].pv, winAfter: winOf(q.lines[0].score) });
    expect(c.summary).toBe('30...Bxe4 31.Rxe4: you’ve given your queen for a bishop');
  }, 60000);

  it('does not claim a move deals with a threat it leaves standing', async () => {
    const fake = { analyze: async (fen) => ({ lines: [{ pv: fen.includes(' b ') && fen.startsWith('8/PbpqNr1k/7p/4Q1p1') ? ['f4g3'] : ['b7a8'], score: { type: 'cp', value: 0 } }] }) };
    const plan = await planOf(fake, BEFORE_QE4, ['a1e1', 'f4g3', 'h2g3', 'b7a8'], { opponentThreat: true });
    plan.win = 0.95;
    const text = describePlan(plan);
    expect(text).not.toMatch(/takes care of the threat/);
    expect(text).toMatch(/leaves your bishop on g3 to be taken \(…fxg3\) — you’re still winning comfortably/);
  });
});


describe('threats found by the coaching audit', () => {
  it('does not call a capture a threat when the material comes straight back', () => {
    // …Rxd2 wins the knight, but Bh5+ and Kxd2 win the rook back.
    const a = explainThreat('4k3/3r4/1P2p2p/2B2p2/8/6P1/r1bNBP1P/2R1K1R1 w - - 3 29', ['d7d2', 'e2h5', 'e8d8', 'e1d2', 'c2e4', 'd2e3']);
    expect(isRealThreat(a)).toBe(false);
    // Bxd7 wins a bishop, but the h-pawn queens.
    const b = explainThreat('5k2/r2b3p/8/3pp3/B4P2/1p2K2p/6P1/8 b - - 0 39', ['a4d7', 'h3h2', 'd7c6', 'h2h1q', 'c6d5', 'b3b2']);
    expect(isRealThreat(b)).toBe(false);
  });

  it('says why taking back fails when the threatened piece looks defended', async () => {
    // Nxe4 looks like a trade (…Qxe4), but Re1 then pins the queen.
    const fen = 'r3kb1r/2pnqpp1/bp1p3p/3P4/4n3/2N3BN/PPP2QPP/R2K3R b kq - 1 16';
    const th = explainThreat(fen, ['c3e4', 'd7e5', 'h3f4', 'e7d7', 'g3h4', 'f8e7', 'h4e7', 'd7e7']);
    expect(th.text).toBe('White threatens Nxe4, taking your knight on e4.');
    const rc = naiveRecapture(fen, th);
    expect(rc.san).toBe('Qxe4');
    const r = await engine.analyze(rc.fen, { depth: 12 });
    expect(recaptureNote(rc, r.lines[0].pv)).toBe('Taking back with …Qxe4 runs into Re1, pinning the queen on e4 to the king.');
    expect((await confirmThreat(engine, fen, th)).recapture).toMatch(/^Taking back with …Qxe4 runs into Re1/);
  }, 30000);

  it('drops a "threat" to take a defended piece when taking back is fine', async () => {
    // …Bxd1 is a bishop trade; the engine's null-move line just preferred Rxe7+ to recapturing.
    const fen = '3r4/1p2p1k1/2p2p2/p6p/3P2b1/8/P2R1PPP/3BR1NK w - - 0 23';
    const th = explainThreat(fen, ['g4d1', 'e1e7', 'g7f8', 'e7e1', 'd1a4', 'd2b2']);
    expect(isRealThreat(th)).toBe(true);
    expect(await confirmThreat(engine, fen, th)).toBe(null);
  }, 30000);

  it('describes a discovered check without garbling the sentence', () => {
    const th = explainThreat('rn2k2r/pp2qppp/2pbb1n1/8/Q1BP4/2N2N2/PP3PPP/R1B1K2R w KQkq - 0 11', ['e6c4', 'c1e3', 'b7b5', 'a4c2']);
    expect(th.text).toBe('Black threatens …Bxc4+, taking your bishop on c4 — a discovered check from the queen on e7.');
  });
});

describe('found by the coaching review', () => {
  it('a pinned pawn is no attacker', () => {
    // The c5 pawn is pinned to its king by the queen on c3, so it can't take on d4 (and
    // …Rxd4 loses the rook to exd4).
    expect(hangingPieces(boardOf('2kr4/8/8/2p5/3P4/2Q1P3/8/4K3 w - - 0 1'), 'w')).toEqual([]);
  });

  it('counts your own capture: Rxb7+ wins the queen for a rook, it doesn’t "hang" the rook', async () => {
    const fen = 'r5nr/Rqk4p/1pp5/2p1Pp2/2N2B1N/3P3P/1PP2PP1/6K1 w - - 0 25';
    const best = await engine.analyze(fen, { depth: 16 });
    const mine = await engine.analyze(fen, { depth: 14, searchmoves: ['a7b7'] });
    const ex = explainMistake({ fen, uci: 'a7b7', movePv: mine.lines[0].pv, winBefore: winOf(best.lines[0].score), winAfter: winOf(mine.lines[0].score), bestPv: best.lines[0].pv, bestScore: best.lines[0].score });
    expect(ex.kind).not.toBe('hangs');
    expect(ex.why).toBe('There was a better way to win the queen on b7, without giving material back.');
  }, 60000);

  it('quotes evaluations from White’s point of view, like the bar', () => {
    const ex = explainMistake({ fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', uci: 'a7a6', movePv: ['a7a6'], winBefore: 0.5, winAfter: 0.35 });
    expect(ex.why).toMatch(/from 0\.0 to \+\d\.\d/);
  });

  it('does not stop you for a threat when you have mate yourself', async () => {
    const fen = '3r4/5ppk/p7/1p2P2p/1P5P/6q1/7r/1K1RR3 b - - 0 40';
    const res = await engine.analyze(nullMoveFen(fen), { depth: 10 });
    const th = explainThreat(fen, res.lines[0].pv);
    expect(await confirmThreat(engine, fen, th, res.lines[0].score)).toBe(null);
  }, 30000);

  it('does not call a rook-and-knight haul "the exchange"', () => {
    const th = explainThreat('5rn1/1p1b2Q1/3bkp1p/3pB3/8/5NP1/5P2/R5K1 b - - 0 37', ['e5d6', 'e6d6', 'g7f8', 'd6c7', 'f8g8']);
    expect(th.text).not.toMatch(/exchange/);
  });

  it('gives a real first hint for a capture, and says when you are being mated', async () => {
    const fen = '2br2r1/2pk3p/8/1P1p1p1q/3p3P/6P1/2PK4/5R2 b - - 3 36';
    const r = await engine.analyze(fen, { depth: 14 });
    const hints = planHints(await planOf(engine, fen, r.lines[0].pv, { opponentThreat: true }));
    expect(hints[0].text).not.toMatch(/No tactic here/);
    const mated = '8/2R4k/1R3p2/3B2pp/p4B2/P2KP3/6PP/8 b - - 1 31';
    const m = await engine.analyze(mated, { depth: 12 });
    expect(describePlan(await planOf(engine, mated, m.lines[0].pv, { opponentThreat: true }))).toMatch(/forced mate whatever you play/);
  }, 60000);
});

describe('contrasting your move with the better one', () => {
  const AFTER_NF3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

  it('says what both moves do, what the better one also does, and what yours costs', () => {
    // 2...f6 and 2...Nc6 both defend e5, but f6 takes the knight's square and, after
    // 3.Nxe5 fxe5 4.Qh5+ Ke7, costs Black castling.
    const vs = contrastMoves({ fen: AFTER_NF3, playedUci: 'f7f6', bestUci: 'b8c6', playedPv: ['f7f6', 'f3e5', 'f6e5', 'd1h5', 'e8e7'], bestPv: ['b8c6', 'f1b5'] });
    expect(vs.text).toBe('Both 2...f6 and 2...Nc6 deal with the attack on your pawn on e5. 2...Nc6 also develops the knight, while 2...f6 takes f6 away from your knight on g8 and costs you the right to castle (4.Qh5+ Ke7).');
    expect(vs.why).toBe('which deals with the attack on your pawn on e5 and develops the knight');
  });

  it('calls a capture that is taken back a trade, not a hanging piece', () => {
    // 9.Bxf6 exf6 is a trade; the cost is the bishop pair, and 9.Nc3 develops with an attack on the queen.
    const fen = 'r3kb1r/pp2pppp/2n1bn2/2pq4/8/1P2PN2/PB1P1PPP/RN1QKB1R w KQkq - 0 9';
    const vs = contrastMoves({ fen, playedUci: 'b2f6', bestUci: 'b1c3', playedPv: ['b2f6', 'e7f6', 'b1c3', 'd5d7'], bestPv: ['b1c3', 'd5d7'] });
    expect(vs.text).not.toMatch(/hanging/);
    expect(vs.text).toMatch(/^9\.Nc3 develops the knight and attacks the queen on d5/);
  });

  it('says a piece was left hanging only if the engine’s line really takes it', () => {
    const fen = 'r4rk1/1q4pp/p1b1p3/1pR1p3/4p1PP/P3Q3/1PP1BP2/3RK3 b - - 3 21';
    // Taking on e5 is the engine's answer: then it's a real cost of 21...Rac8.
    const taken = contrastMoves({ fen, playedUci: 'a8c8', bestUci: 'c6d5', playedPv: ['a8c8', 'c5e5', 'c8c2'] });
    expect(taken.text).toBe('21...Bd5 deals with the attack on your pawn on e5, while 21...Rac8 leaves your pawn on e5 hanging.');
    // The engine prefers 22.c4 (22.Rxe5 would be bad for White): no such claim.
    const notTaken = contrastMoves({ fen, playedUci: 'a8c8', bestUci: 'c6d5', playedPv: ['a8c8', 'c2c4', 'b5c4'] });
    expect(notTaken?.text || '').not.toMatch(/hanging|deals with the attack/);
  });

  it('says nothing when there is nothing concrete to say', () => {
    expect(contrastMoves({ fen: 'rnbqkbnr/pp1ppppp/2p5/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 0 2', playedUci: 'g1h3', bestUci: 'b1c3' })).toBe(null);
  });
});
