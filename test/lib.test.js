import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { boardOf, see, hangingPieces, motifsOfMove, analyzeLine, threatsBy } from '../src/lib/tactics.js';
import { review, Rating, newSchedule, autoRating, mastery, isDue } from '../src/lib/fsrs.js';
import { gradeFromLoss, winOf, formatScore, gameAccuracy } from '../src/lib/evaluation.js';
import { COURSES, repertoireAt, openingRuns, cardIdFor } from '../src/lib/courses.js';
import { bookMovesAt, openingOf } from '../src/lib/openings.js';
import { styleBonus, strengthParams, chooseMove, personaById } from '../src/lib/opponent.js';
import { explainMistake, describeQuietMove } from '../src/lib/explain.js';
import { formatLine, nullMoveFen, playLine, lineText } from '../src/lib/chessutil.js';

const types = (fen, uci) => motifsOfMove(fen, uci).map((m) => m.type);

describe('tactics (turn-independent)', () => {
  it('sees a knight fork of king and rook', () => {
    expect(types('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7')).toContain('fork');
  });
  it('sees an absolute pin and a relative pin', () => {
    const abs = motifsOfMove('r1bqkbnr/ppp2ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', 'f1b5');
    expect(abs[0]).toMatchObject({ type: 'pin', absolute: true });
    const rel = motifsOfMove('3qk3/8/5n2/8/8/8/8/2B1K3 w - - 0 1', 'c1g5');
    expect(rel[0]).toMatchObject({ type: 'pin', absolute: false });
  });
  it('sees a skewer through the king', () => {
    expect(types('8/8/8/4k2q/8/8/8/R3K3 w - - 0 1', 'a1a5')).toContain('skewer');
  });
  it('sees a discovered attack', () => {
    expect(types('3q2k1/8/8/8/8/3B4/8/3RK3 w - - 0 1', 'd3h7')).toContain('discovered');
  });
  it('detects threats for the side NOT to move (the old app returned nothing here)', () => {
    // After 1.e4 e5 2.Nf3 it is Black's move, but White's knight still attacks e5.
    const g = new Chess();
    ['e4', 'e5', 'Nf3'].forEach((m) => g.move(m));
    const t = threatsBy(boardOf(g), 'f3');
    expect(t.map((x) => x.square)).toContain('e5');
  });
  it('evaluates exchanges with SEE, including x-rays', () => {
    expect(see(boardOf('4k3/8/3p4/4n3/3P4/8/8/4K3 w - - 0 1'), 'e5', 'w')).toBe(2); // PxN, PxP
    expect(hangingPieces(boardOf('4k3/8/8/4n3/3P4/8/8/4K3 b - - 0 1'), 'b')[0]).toMatchObject({ square: 'e5', gain: 3 });
    // Doubled rooks: Rxd5 Rxd5 Rxd5 nets the pawn
    expect(see(boardOf('3r2k1/8/8/3p4/8/8/3R4/3R2K1 w - - 0 1'), 'd5', 'w')).toBe(1);
  });
  it('analyses a forcing line: what it wins and where it is banked', () => {
    const L = analyzeLine('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', ['d5c7', 'e8d7', 'c7a8']);
    expect(L.gain).toBe(5);
    expect(L.keyIdx).toBe(2);
    expect(L.motif.type).toBe('fork');
    const M = analyzeLine('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ['f3f7']);
    expect(M.mateIdx).toBe(0);
  });
});

describe('explanations', () => {
  it('names the loose piece without naming the better move', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR w KQkq - 0 2';
    const ex = explainMistake({ fen, uci: 'f3f7', movePv: ['f3f7', 'e8f7'], winBefore: 0.5, winAfter: 0.02 });
    expect(ex.why).toMatch(/queen on f7/);
    expect(ex.refutation).toMatch(/Kxf7/);
    expect(ex.why).not.toMatch(/Nf3|Bc4|d4/);
  });
  it('describes quiet moves concretely', () => {
    expect(describeQuietMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4')).toMatch(/centre/);
    expect(describeQuietMove('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'e1g1')).toMatch(/castles/);
  });
  it('says what quiet pawn moves are for', () => {
    // Reported from play: "11.b3 pushes the pawn to b3" explained nothing.
    const fen = 'r2qk2r/1pp2pp1/pbnpbn1p/4p3/2B1P3/2PP1NN1/PP3PPP/R1BQR1K1 w kq - 2 11';
    expect(describeQuietMove(fen, 'b2b3')).toBe('supports the bishop on c4, which Black’s bishop on e6 is challenging');
    expect(describeQuietMove('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1', 'b2b3')).toMatch(/opens the way for your bishop on c1/);
    expect(describeQuietMove('r1bq1rk1/ppp2ppp/2n2n2/3pp3/8/3P1N2/PPP1PPPP/RNBQ1RK1 w - - 0 7', 'h2h3')).toMatch(/escape square on h2.*off g4/);
  });
  it('writes lines in standard notation, starting from either side', () => {
    const steps = playLine('r2qk2r/1pp2pp1/pbnpbn1p/4p3/2B1P3/1PPP1NN1/P4PPP/R1BQR1K1 b kq - 0 11', ['e8g8', 'a2a4', 'f8e8']);
    expect(lineText(steps)).toBe('11...O-O 12.a4 Re8');
  });
  it('formats lines with move numbers from any side', () => {
    expect(formatLine('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', ['e5', 'Nf3'])).toBe('1...e5 2.Nf3');
  });
  it('builds a legal null-move position (or refuses when in check)', () => {
    expect(nullMoveFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1').split(' ')[1]).toBe('w');
    expect(nullMoveFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toBeNull();
  });
});

describe('FSRS scheduling', () => {
  const DAY = 86400000;
  it('grows intervals on success and shrinks them on failure', () => {
    let s = review(newSchedule(), Rating.Good, 0);
    const first = s.due;
    expect(first).toBeGreaterThanOrEqual(3 * DAY);
    s = review(s, Rating.Good, first);
    expect(s.due - first).toBeGreaterThan(first);
    const lapsed = review(s, Rating.Again, s.due);
    expect(lapsed.due - s.due).toBeLessThan(DAY);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.stability).toBeLessThan(s.stability);
  });
  it('grades automatically from performance', () => {
    expect(autoRating({ correct: false })).toBe(Rating.Again);
    expect(autoRating({ correct: true, hintsUsed: 1 })).toBe(Rating.Hard);
    expect(autoRating({ correct: true, ms: 3000, reps: 0 })).toBe(Rating.Good);
    expect(autoRating({ correct: true, ms: 2000, reps: 3 })).toBe(Rating.Easy);
  });
  it('reports mastery levels and due-ness', () => {
    expect(mastery(newSchedule()).label).toBe('New');
    const s = review(newSchedule(), Rating.Easy, 0);
    expect(mastery(s).level).toBeGreaterThanOrEqual(3);
    expect(isDue(s, 0)).toBe(false);
    expect(isDue(s, s.due)).toBe(true);
  });
});

describe('grading', () => {
  it('maps expected-score loss to grades', () => {
    expect(gradeFromLoss(0, true)).toBe('best');
    expect(gradeFromLoss(0.04)).toBe('good');
    expect(gradeFromLoss(0.08)).toBe('inaccuracy');
    expect(gradeFromLoss(0.15)).toBe('mistake');
    expect(gradeFromLoss(0.4)).toBe('blunder');
  });
  it('handles mate scores and formatting', () => {
    expect(winOf({ type: 'mate', value: 3 })).toBe(1);
    expect(winOf({ type: 'mate', value: -2 })).toBe(0);
    expect(formatScore({ type: 'cp', value: 150 }, 'b', 'w')).toBe('−1.5');
    expect(formatScore({ type: 'mate', value: 2 }, 'w', 'w')).toBe('M2');
  });
  it('does not let one blunder hide behind many good moves', () => {
    const clean = gameAccuracy([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const oneBlunder = gameAccuracy([0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5]);
    expect(clean).toBeGreaterThan(95);
    expect(oneBlunder).toBeLessThan(clean - 10);
  });
});

describe('opening courses', () => {
  it('loads every course with one repertoire move per learner position', () => {
    expect(COURSES.length).toBeGreaterThan(0);
    for (const c of COURSES) {
      for (const node of c.nodes.values()) {
        if (node.learnerToMove) expect(node.moves.size, `${c.id} ${node.fen}`).toBe(1);
      }
      for (const l of c.lines) {
        const total = Array.isArray(l.moves) ? l.moves.length : l.moves.split(/\s+/).length;
        expect(l.steps.length, `${c.id}/${l.id} has an illegal move`).toBe(total);
        expect(l.steps[l.steps.length - 1].learner, `${c.id}/${l.id} must end on a learner move`).toBe(true);
      }
    }
  });
  it('finds the repertoire move by position (transpositions included)', () => {
    const c = COURSES[0];
    const line = c.lines[0];
    const step = line.steps.find((s) => s.learner);
    const hit = repertoireAt(step.fen, c.learner, [c.id]);
    expect(hit.move.uci).toBe(step.uci);
    expect(repertoireAt(step.fen, c.learner, [])).toBeNull();
  });
  it('turns due cards into line runs that cover each card once', () => {
    const c = COURSES[0];
    const due = c.lines.slice(0, 3).flatMap((l) => l.steps.filter((s) => s.learner)).map((s) => ({ courseId: c.id, epd: s.epd, id: cardIdFor(c.id, s.epd) }));
    const unique = new Set(due.map((d) => d.epd));
    const runs = openingRuns(due);
    const covered = runs.flatMap((r) => [...r.quiz]);
    expect(new Set(covered).size).toBe(unique.size);
    expect(covered.length).toBe(unique.size);
  });
});

describe('opening book & names', () => {
  it('names openings by position', () => {
    const g = new Chess();
    const fens = [g.fen()];
    for (const m of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']) { g.move(m); fens.push(g.fen()); }
    expect(openingOf(fens)?.name).toMatch(/Najdorf/);
  });
  it('has book moves for the opening position', () => {
    const moves = bookMovesAt(new Chess().fen());
    expect(moves.map((m) => m.san)).toEqual(expect.arrayContaining(['e4', 'd4']));
  });
  it('lets a persona prefer its own openings', async () => {
    const counts = {};
    const fake = { analyze: async () => null };
    for (let i = 0; i < 200; i++) {
      const r = (i * 7919 % 1000) / 1000;
      const m = await chooseMove(fake, new Chess().fen(), { persona: personaById('grinder'), elo: 1500, ply: 0, learnerColor: 'b', rng: () => r });
      counts[m.uci] = (counts[m.uci] || 0) + 1;
    }
    expect(counts.d2d4 || 0).toBeGreaterThan(counts.e2e4 || 0);
  });
});

describe('opponent style', () => {
  it('tactical players like checks and captures; solid players like trades', () => {
    // White can trade queens on d8, or play a quiet move.
    const fen = 'rnbqkbnr/ppp2ppp/8/3pp3/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
    const trade = 'd4e5';
    expect(styleBonus('solid', 'r1bqkbnr/pppp1ppp/2n5/8/3Q4/8/PPP2PPP/RNB1KBNR b KQkq - 0 4', 'd8d4') + 0).toBeTypeOf('number');
    expect(styleBonus('tactical', fen, trade)).toBeGreaterThan(styleBonus('solid', fen, 'g1f3') - 100);
    expect(styleBonus('balanced', fen, trade)).toBe(0);
  });
  it('scales strength sensibly', () => {
    const weak = strengthParams(700), strong = strengthParams(2300);
    expect(weak.depth).toBeLessThan(strong.depth);
    expect(weak.temperature).toBeGreaterThan(strong.temperature);
    expect(weak.blunder).toBeGreaterThan(strong.blunder);
    expect(strong.blunder).toBeLessThan(0.01);
  });
});
