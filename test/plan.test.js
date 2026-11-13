// Explanations and hints, checked on a real position reported from play (move 12, White to move).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNodeEngine } from './nodeWorker.js';
import { planOf, planSync, describePlan, planHints } from '../src/lib/plan.js';
import { motifsOfMove, hangingPieces, boardOf, analyzeLine } from '../src/lib/tactics.js';
import { describeQuietMove, winningsPhrase } from '../src/lib/explain.js';
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
    expect(ex.kind).toBe('missed-win');
    // (Depending on how deep the engine sees, it may also find a forced mate here.)
    expect(ex.why).toMatch(/^There was a better way to win the queen on b7, without giving material back\.$|^It misses a forced mate/);
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

// Found by reading what the coach said in simulated games: each of these was "true" clause
// by clause, and told the learner the wrong story.
describe('the story has to be right, not just the facts', () => {
  const mistake = (fen, movePv, bestPv, winBefore = 0.5, winAfter = 0.15) => explainMistake({ fen, uci: movePv[0], movePv, winBefore, winAfter, bestPv });
  const types = (fen, uci) => motifsOfMove(fen, uci).map((m) => m.type);

  it('a move that walks into mate is about the mate, not the material', () => {
    const fen = 'rnbqR2k/pp3ppB/2p5/2np4/1P1b4/2N5/P1P2PPP/R1BQ2K1 b - - 0 15';
    const c = explainConsequence({ fen, movePv: ['h8h7', 'd1h5'], winAfter: 0 });
    expect(c.summary).toBe('16.Qh5#');
    expect(c.text).toBe('White answers 16.Qh5 — checkmate.');
    const longer = explainConsequence({ fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', movePv: ['g8f6', 'h5f7'], winAfter: 0 });
    expect(longer.summary).toBe('4.Qxf7#');
  });

  it('never calls the king the cheaper attacker', () => {
    const ex = mistake('r6r/1pq2k1p/2b1p1pQ/7n/pn1PBP1P/P1N2N2/1P1RPP2/4K2R w K - 1 19', ['e4g6', 'h7g6', 'f3g5', 'f7f6', 'g5e6', 'c7a5', 'a3b4', 'h8h6', 'b4a5', 'c6h1'], ['e4c6']);
    expect(ex.why).toBe('Your bishop on g6 isn’t safe there — the pawn on h7 can take it, and taking back only wins a pawn.');
  });

  it('says a piece is lost even when the engine’s line detours through a queen sacrifice', () => {
    // 6.Nxd5 loses a knight for a pawn; the line 6...Qxd5 7.Nf3 Qxg5!? used to read as "doesn’t lose material".
    const ex = mistake('rnbqk2r/ppp1bppp/5n2/3p2B1/3P4/2N5/PP2PPPP/R2QKBNR w KQkq - 2 6', ['c3d5', 'd8d5', 'g1f3', 'd5g5', 'f3g5', 'e7b4', 'd1d2', 'b4d2', 'e1d2', 'c7c5'], ['e2e3', 'e8g8', 'f1d3'], 0.53, 0.2);
    expect(ex.why).toBe('Your knight on d5 isn’t safe there — nothing defends it.');
  });

  it('words a trade you come out ahead on as a win', () => {
    const c = explainConsequence({ fen: '2qr2k1/p4pb1/1p4pp/3r1b2/P1PPp3/4B1P1/1P1Q1P1P/1R2R1K1 w - - 0 25', movePv: ['e1c1', 'd5d4', 'e3d4', 'd8d4', 'd2e3', 'g8h7', 'b2b4', 'd4d3'], winAfter: 0.3 });
    expect(c.summary).toBe('25...Rxd4 26.Bxd4 Rxd4: you’ve won a rook for a bishop and a pawn');
    expect(c.text).toMatch(/But Black still has the better position\.$/);
  });

  it('“ignores the threat” also when the best move was to trade the attacked pawn off', () => {
    const ex = mistake('rnbqkb1r/ppp2ppp/3p1n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 1 4', ['e8d7', 'd4e5', 'f6g8', 'c1g5', 'f8e7', 'g5e7', 'g8e7', 'e5d6', 'c7d6'], ['e5d4', 'f3d4'], 0.45, 0.17);
    expect(ex.why).toBe('This ignores the threat: your pawn on e5 was already under attack, and it’s still attacked more times than it’s defended.');
  });

  it('doesn’t blame a move for a pawn that was lost whatever you played', () => {
    const ex = mistake('r2r4/4p1k1/6N1/p2p3p/1p3PnP/3B2P1/PPP5/2K1R3 b - - 0 27', ['g7f6', 'g6e7', 'd8d7', 'e7f5', 'd7d8'], ['g4f2', 'g6e7', 'f2d3', 'c2d3', 'd8e8', 'e1e5', 'g7f7', 'e7d5', 'e8e5', 'f4e5'], 0.3, 0.18);
    expect(ex.why).toMatch(/^You were losing material whatever you played here, but this makes it worse/);
    expect(ex.why).not.toMatch(/walks into|doesn’t lose material/);
  });

  it('a threat is what it wins right away, not what a long what-if line picks up later', () => {
    const pawn = explainThreat('r5r1/4p1k1/8/p3P2p/1p1p3P/3B2P1/PPP1N3/2K1R3 b - - 1 30', ['e2d4', 'g7h8', 'e5e6', 'a8f8', 'd4f5', 'f8f5', 'd3f5']);
    expect(pawn.text).toBe('White threatens Nxd4, taking your pawn on d4.');
    expect(isRealThreat(pawn)).toBe(false); // one pawn isn't worth stopping the game for
    const fork = explainThreat('rnbqk1nr/ppp2ppp/4p3/3P4/1b1P4/2N5/PP2PPPP/R1BQKBNR b KQkq - 0 4', ['d1a4', 'c8d7', 'a4b4', 'c7c5', 'd4c5', 'b8a6', 'b4a3', 'e6d5']);
    expect(fork.text).toBe('White threatens Qa4+ — a fork of the king and the bishop on b4 — winning the bishop on b4.');
  });

  it('doesn’t count your own sacrifice in a what-if line as their threat', () => {
    // …Bxa5 takes a pawn; the line then has White giving a bishop on h6 for an attack.
    const th = explainThreat('r1qrn3/pp3b1k/2n2Ppp/P1P5/1b2N3/4BNP1/4QPBP/R1R3K1 w - - 1 30', ['b4a5', 'e3h6', 'h7h6', 'e2e3']);
    expect(th.text).toBe('Black threatens …Bxa5, taking your pawn on a5.');
    expect(isRealThreat(th)).toBe(false);
  });

  it('names the discovered attack that makes a pawn capture dangerous', () => {
    const th = explainThreat('2r1r1k1/pppbppbp/2nq2p1/3p3n/Q2P4/2P1PN2/PP1NBPP1/R1B1K2R w Q - 2 13', ['c6d4', 'a4d4', 'g7d4', 'e3d4', 'd7g4', 'e1f1', 'd6d8', 'h1h4']);
    expect(th.text).toBe('Black threatens …Nxd4, taking your pawn on d4 — uncovering an attack on the queen on a4 — winning a piece.');
    expect(isRealThreat(th)).toBe(true);
  });

  it('a queen that can be taken for a rook is the threat, whatever the line does afterwards', () => {
    const th = explainThreat('2r1k2r/1bqnbp2/pp1p2p1/3Pp2p/4P3/PN1QBP2/1P1RB1PP/1KR5 b k - 4 20', ['c1c7', 'c8c7', 'e3b6', 'd7b6']);
    expect(th.text).toBe('White’s rook on c1 attacks your queen on c7 — Rxc7 would cost you the queen for a rook.');
  });

  it('names the tactic even when the count is cut off mid-exchange', () => {
    // 12...Kh7 13.Nf5+ uncovers a check from the queen and hits the queen on e7; six plies in,
    // the trades are still going on, which used to hide the tactic altogether.
    const ex = mistake('r1b2rk1/pp2q1p1/2p4N/2bn3Q/2Bn4/P2P4/1PP2PPP/RNB2RK1 b - - 0 12', ['g8h7', 'h6f5', 'h7g8', 'f5e7', 'c5e7', 'c4d5', 'c6d5', 'h5d5', 'd4e6', 'f1e1'], ['g7h6', 'b1c3', 'c8e6', 'c3e4'], 0.45, 0.1);
    expect(ex.why).toMatch(/^It walks into a tactic: 13\.Nf5\+ is a discovered check from the queen on h5/);
  });

  it('doesn’t trust a momentary material blip deep in the line', () => {
    // 19.Bf2 Qxf2+ drops a bishop (Rxf2 allows mate); ten moves on the count briefly reads level.
    const ex = mistake('2r2rk1/4bppp/n7/pp1NN3/3qnP2/PQ6/1P4PP/2R1BRK1 w - - 0 19', ['e1f2', 'd4f2', 'g1h1', 'e7h4', 'e5f7', 'c8c4', 'f7e5', 'a6c5', 'b3a2', 'c5d3', 'e5d3', 'f2d4', 'd5b6', 'd4d3'], ['g1h1', 'c8c1', 'd5e7', 'g8h8', 'e5f7', 'f8f7', 'b3f7', 'e4f2', 'h1g1', 'f2h3', 'g1h1']);
    expect(ex.why).not.toMatch(/doesn’t lose material/);
    expect(ex.why).toBe('Black has a forcing sequence that wins the bishop on f2.');
  });

  it('blames the line the move opened, not the piece that moved', () => {
    const ex = mistake('rn1rn1k1/ppq2pbp/6p1/P3p3/4N1b1/2PP1NP1/1P2QPBP/R1B2RK1 w - - 1 21', ['f3e5', 'g4e2', 'f1e1', 'g7e5', 'e1e2', 'e8f6', 'c1h6', 'b8d7'], ['c1g5', 'd8d7', 'b2b4', 'b8a6']);
    expect(ex.why).toBe('Moving the knight opened the line from Black’s bishop on g4 to your queen on e2.');
  });

  it('taking back in a trade is “taking back”, and what it costs is counted from there', () => {
    const fen = 'r3kb1r/p1pp2pp/b1p2P2/3n4/2P5/6P1/PP2qP1P/RNB1KB1R w KQkq - 0 11';
    const pv = ['e1e2', 'a6c4', 'e2e1', 'c4f1', 'e1f1', 'd5f6', 'f1g2', 'f8c5', 'b1c3', 'e8g8'];
    expect(mistake(fen, pv, ['f1e2', 'd5f6', 'c1e3', 'f8b4']).why).toBe('There was a better way to take back the queen on e2, without giving material back.');
    expect(explainConsequence({ fen, movePv: pv, winAfter: 0.3 }).summary).toBe('11...Bxc4+ 12.Ke1 Bxf1 13.Kxf1 Nxf6: you’ve lost two pawns');
  });

  it('a capture that forks is explained as the fork, not as a loose pawn', () => {
    const ex = mistake('2r2rk1/1q4pp/p1b1p3/2R1p3/2B1p1PP/P3Q3/1P3P2/3RK3 b - - 0 23', ['b7b2', 'c4e6', 'g8h8', 'e6c8', 'c6a4', 'd1c1', 'h7h5', 'c8f5'], ['c8e8', 'd1d6', 'c6b5', 'c4b5']);
    expect(ex.why).toMatch(/^It walks into a tactic: 24\.Bxe6\+ forks the king and the rook on c8/);
  });

  it('an even-looking queen capture that wins material says so', () => {
    const th = explainThreat('4r3/rk2q1bp/p2pQpn1/1p5P/4PP2/1B2N1P1/PPP5/1K1R3R w - - 1 27', ['e7e6', 'b3e6', 'e8e6', 'h5g6']);
    expect(th.text).toBe('Black’s queen on e7 attacks your queen on e6 — …Qxe6 would win material — you can’t take back without losing more.');
  });

  it('gives the bottom line when a pawn promotes in the line', () => {
    const c = explainConsequence({ fen: '8/4k1p1/4P1p1/p1r4p/2PN3P/2K5/P7/4RR2 b - - 0 38', movePv: ['c5f5', 'd4f5', 'g6f5', 'f1f5', 'a5a4', 'f5f7', 'e7e8', 'f7g7', 'e8f8', 'e6e7', 'f8g7', 'e7e8q', 'g7h7', 'e1e7'], winAfter: 0.01 });
    expect(c.summary).toMatch(/White’s pawn promotes and you come out .* down$/);
    expect(c.summary).not.toMatch(/you’ve given/);
  });

  it('only calls it a skewer if the piece behind can be won', () => {
    // The pawn behind the queen is defended: nothing "falls".
    expect(types('3r2k1/1Q3p2/1p5p/5bp1/P2bp3/4B1P1/1q3P1P/2R1R1K1 w - - 0 34', 'c1b1')).not.toContain('skewer');
    expect(types('rnb1k2r/ppp1nppp/3p4/8/3Pq3/1Q2B3/PP1KNPPP/R4B1R b kq - 1 9', 'c8e6')).not.toContain('skewer');
    expect(types('r3k3/8/8/8/8/8/8/R3K2R w - - 0 1', 'h1h8')).toContain('skewer');
  });

  it('names a big piece won for a small one', () => {
    const L = analyzeLine('2r1r2k/pq4pp/8/5p2/P1nP2R1/4P2P/1P1BKP2/Q7 b - - 0 29', ['f5g4', 'h3g4'], 4);
    expect(winningsPhrase(L)).toBe('the rook on g4 for a pawn');
  });

  it('doesn’t promise material the engine says isn’t really won', () => {
    const fen = 'rn1qkbnr/ppp3pp/2b1p3/5pN1/3P4/3BB3/PPP2PPP/R2QK1NR b KQkq - 1 7';
    const pv = ['c6g2', 'g5e6', 'd8e7', 'd3f5', 'g7g6', 'd4d5', 'b8a6', 'f5h3', 'g2h1', 'c2c3'];
    expect(describePlan(planSync(fen, pv))).toMatch(/It pays off a few moves later.*you’ve won/); // without the engine's verdict
    expect(describePlan(planSync(fen, pv, { type: 'cp', value: 8 }))).toBe('7...Bxg2 takes the pawn on g2. A likely continuation: 7...Bxg2 8.Nxe6 Qe7 9.Bxf5.');
  });
});
