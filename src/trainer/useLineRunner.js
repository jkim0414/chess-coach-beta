import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

/**
 * Plays an opening line move by move.
 *  mode 'learn': every learner move is shown (arrow + note) and the learner plays it.
 *  mode 'recall': learner moves in `quiz` (a Set of position keys, or all if null) must be
 *                 recalled; other moves play automatically. Wrong answers show the right
 *                 move, which the learner then plays to reinforce it.
 * onResult(step, {correct, ms}) fires once per quizzed step.
 * Mount a fresh instance (React `key`) for each run.
 */
const initial = () => ({ idx: 0, fen: new Chess().fen(), lastMove: null, correcting: false, wrong: null, note: null, noteSan: null, noteColor: null, correctCount: 0, total: 0 });

const advance = (x, step) => ({
  ...x, idx: x.idx + 1, fen: step.fenAfter, lastMove: { from: step.uci.slice(0, 2), to: step.uci.slice(2, 4) },
  note: step.note, noteSan: step.san, noteColor: step.color, correcting: false, wrong: null,
});

export function useLineRunner({ line, mode, quiz = null, onResult, onDone, autoDelay = 550 }) {
  const [s, setS] = useState(initial);
  const askedAt = useRef(0);
  const results = useRef([]);
  const doneFired = useRef(false);

  const step = line?.steps[s.idx];
  const done = !!line && !step;
  const quizzed = !!step && step.learner && (mode === 'learn' || !quiz || quiz.has(step.epd));
  const phase = done ? 'done' : s.correcting ? 'correct-it' : quizzed ? (mode === 'learn' ? 'show' : 'ask') : 'auto';

  // Auto-play moves that aren't questions.
  useEffect(() => {
    if (phase !== 'auto' || !step) return undefined;
    const t = setTimeout(() => setS((x) => advance(x, step)), s.idx === 0 ? 350 : autoDelay);
    return () => clearTimeout(t);
  }, [phase, step, s.idx, autoDelay]);

  // Start the clock when a question appears.
  useEffect(() => {
    if (phase === 'ask' || phase === 'show') askedAt.current = Date.now();
  }, [phase, s.idx]);

  useEffect(() => {
    if (done && !doneFired.current) { doneFired.current = true; onDone?.(results.current); }
  }, [done, onDone]);

  const move = useCallback((from, to, promotion = 'q') => {
    if (!step || !['ask', 'show', 'correct-it'].includes(phase)) return false;
    const ok = from + to === step.uci.slice(0, 4) && (step.uci.length === 4 || promotion === step.uci[4]);
    if (!ok) {
      if (phase === 'ask') {
        let san = '';
        try { san = new Chess(s.fen).move({ from, to, promotion })?.san || ''; } catch { san = ''; }
        if (!san) return false;
        const r = { correct: false, ms: Date.now() - askedAt.current };
        results.current.push({ step, ...r });
        onResult?.(step, r);
        setS((x) => ({ ...x, correcting: true, wrong: san, total: x.total + 1 }));
      }
      return false;
    }
    const asked = phase === 'ask';
    if (asked) {
      const r = { correct: true, ms: Date.now() - askedAt.current };
      results.current.push({ step, ...r });
      onResult?.(step, r);
    }
    setS((x) => ({ ...advance(x, step), correctCount: x.correctCount + (asked ? 1 : 0), total: x.total + (asked ? 1 : 0) }));
    return true;
  }, [step, phase, s.fen, onResult]);

  const showArrow = step && (phase === 'show' || phase === 'correct-it');
  const arrows = showArrow ? [{ startSquare: step.uci.slice(0, 2), endSquare: step.uci.slice(2, 4), color: phase === 'show' ? 'rgba(59,130,246,0.85)' : 'rgba(34,197,94,0.85)' }] : [];
  return { ...s, phase, done, step, arrows, move, progress: line ? s.idx / line.steps.length : 0 };
}
