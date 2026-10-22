import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { uciToObj, moveToUci, turnOf as turnOfFen } from '../lib/chessutil.js';
import { winOf } from '../lib/evaluation.js';

/**
 * Engine check for alternative solutions: accept a move if it's (nearly) as good as
 * the best one. Returns the move's PV when accepted, else null.
 */
export async function engineAccepts(engine, fen, uci, tol = 0.04) {
  const best = await engine.analyze(fen, { depth: 14, movetime: 2500 });
  if (!best?.lines[0]) return null;
  if (best.lines[0].pv[0] === uci) return best.lines[0].pv;
  const mine = await engine.analyze(fen, { depth: 14, searchmoves: [uci], movetime: 2500 });
  if (!mine?.lines[0]) return null;
  return winOf(best.lines[0].score) - winOf(mine.lines[0].score) <= tol ? mine.lines[0].pv : null;
}

/**
 * Interactive "find the move(s)" solver. The learner plays the moves at even indexes
 * of `solution`; the replies at odd indexes are played automatically.
 *  - firstAnswers: extra accepted first moves (e.g. several equally good moves)
 *  - accept(fen, uci, expected): optional async check for alternatives → new PV or null
 */
export function useSolver({ fen, solution, firstAnswers = [], accept, replyDelay = 500, key }) {
  const [state, setState] = useState(() => init(fen));
  const sol = useRef(solution);
  const startedAt = useRef(Date.now());
  const busy = useRef(false);

  function init(f) {
    return { fen: f, idx: 0, status: 'solving', attempts: 0, hintLevel: 0, lastMove: null, wrong: null, arrows: [], marks: {}, checking: false, ms: 0 };
  }

  useEffect(() => {
    sol.current = solution;
    startedAt.current = Date.now();
    busy.current = false;
    setState(init(fen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key ?? fen]);

  const playReply = useCallback((g, idx) => {
    const reply = sol.current[idx];
    if (!reply) {
      setState((s) => ({ ...s, status: 'done', ms: Date.now() - startedAt.current, checking: false }));
      return;
    }
    setTimeout(() => {
      const r = g.move(uciToObj(reply));
      const nextIdx = idx + 1;
      const done = nextIdx >= sol.current.length || g.isGameOver();
      setState((s) => ({ ...s, fen: g.fen(), idx: nextIdx, lastMove: { from: r.from, to: r.to }, status: done ? 'done' : 'solving', ms: done ? Date.now() - startedAt.current : s.ms, arrows: [], marks: {}, checking: false }));
      busy.current = false;
    }, replyDelay);
  }, [replyDelay]);

  const move = useCallback(async (from, to, promotion = 'q') => {
    if (busy.current) return false;
    const g = new Chess(state.fen);
    let r;
    try { r = g.move({ from, to, promotion }); } catch { r = null; }
    if (!r) return false;
    const uci = moveToUci(r);
    const expected = sol.current[state.idx];
    let ok = uci === expected || g.isCheckmate() || (state.idx === 0 && firstAnswers.includes(uci));
    busy.current = true;
    if (!ok && accept) {
      setState((s) => ({ ...s, checking: true }));
      const pv = await accept(state.fen, uci, expected);
      // Accepted alternative: continue with the engine's line from here, keeping the same length.
      if (pv) { ok = true; sol.current = [...sol.current.slice(0, state.idx), ...pv.slice(0, Math.max(1, sol.current.length - state.idx))]; }
    }
    if (!ok) {
      busy.current = false;
      setState((s) => ({ ...s, attempts: s.attempts + 1, wrong: { from, to, san: r.san }, checking: false, marks: { [to]: 'bad' } }));
      return false;
    }
    const nextIdx = state.idx + 1;
    const done = nextIdx >= sol.current.length || g.isGameOver();
    setState((s) => ({ ...s, fen: g.fen(), idx: nextIdx, lastMove: { from: r.from, to: r.to }, wrong: null, arrows: [], marks: {}, status: done ? 'done' : 'replying', ms: done ? Date.now() - startedAt.current : s.ms, checking: false }));
    if (done) busy.current = false;
    else playReply(g, nextIdx);
    return true;
  }, [state.fen, state.idx, firstAnswers, accept, playReply]);

  /** Next hint. `visual` ({marks, arrows}) overrides the default piece-then-arrow highlights. */
  const hint = useCallback((visual) => {
    setState((s) => {
      const u = sol.current[s.idx];
      if (!u) return s;
      const level = s.hintLevel + 1;
      if (visual) return { ...s, hintLevel: level, marks: visual.marks || {}, arrows: visual.arrows || [] };
      return { ...s, hintLevel: level, marks: { [u.slice(0, 2)]: 'hint' }, arrows: level >= 2 ? [{ startSquare: u.slice(0, 2), endSquare: u.slice(2, 4), color: 'rgba(34,197,94,0.85)' }] : [] };
    });
  }, []);

  /** Reveal: play the rest of the solution on the board, one move at a time, then mark it failed. */
  const reveal = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    const g = new Chess(state.fen);
    const frames = [];
    for (const u of sol.current.slice(state.idx)) {
      let r;
      try { r = g.move(uciToObj(u)); } catch { r = null; }
      if (!r) break;
      frames.push({ fen: g.fen(), lastMove: { from: r.from, to: r.to }, arrow: { startSquare: r.from, endSquare: r.to, color: r.color === turnOfFen(state.fen) ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.7)' } });
    }
    setState((s) => ({ ...s, status: 'revealing', arrows: frames[0] ? [frames[0].arrow] : [], marks: {} }));
    frames.forEach((f, i) => {
      setTimeout(() => {
        const last = i === frames.length - 1;
        setState((s) => ({ ...s, fen: f.fen, lastMove: f.lastMove, arrows: last ? [] : [frames[i + 1].arrow], status: last ? 'failed' : 'revealing', ms: Date.now() - startedAt.current }));
        if (last) busy.current = false;
      }, 700 * (i + 1));
    });
    if (!frames.length) { busy.current = false; setState((s) => ({ ...s, status: 'failed' })); }
  }, [state.fen, state.idx]);

  return { ...state, move, hint, reveal, solution: sol.current };
}
