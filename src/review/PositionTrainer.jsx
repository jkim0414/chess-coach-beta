import { useEffect, useRef, useState } from 'react';
import Board from '../components/Board.jsx';
import { useSolver } from '../trainer/useSolver.js';
import { formatLine, pvToSan, turnOf, COLOR_NAME } from '../lib/chessutil.js';

/**
 * "Find the move" on one position. The learner plays every move of their side in
 * `solution`; replies are automatic. Calls onFinish once with how it went.
 */
export default function PositionTrainer({ fen, orientation, solution, firstAnswers, lastMove, prompt, context, explanation, accept, onFinish, footer, runKey, getHints }) {
  const s = useSolver({ fen, solution, firstAnswers, accept, key: runKey });
  const reported = useRef(false);
  const side = turnOf(fen);
  // Hint text belongs to the position it was given for.
  const [hint, setHint] = useState({ fen: null, text: null, loading: false });
  const hintText = hint.fen === s.fen ? hint.text : null;
  const maxHints = getHints ? 3 : 2;

  async function onHint() {
    if (!getHints) { s.hint(); return; }
    const at = s.fen;
    setHint({ fen: at, text: hintText, loading: true });
    const hs = await getHints(at, s.solution[s.idx]);
    const h = hs?.[s.hintLevel];
    if (!h) { setHint({ fen: at, text: null, loading: false }); s.hint(); return; }
    s.hint({ marks: h.marks, arrows: h.arrows });
    setHint({ fen: at, text: h.text, loading: false });
  }

  useEffect(() => { reported.current = false; }, [runKey]);
  useEffect(() => {
    if ((s.status === 'done' || s.status === 'failed') && !reported.current) {
      reported.current = true;
      onFinish?.({ solved: s.status === 'done', attempts: s.attempts + 1, hintLevel: s.hintLevel, ms: s.ms });
    }
  }, [s.status, s.attempts, s.hintLevel, s.ms, onFinish]);

  const finished = s.status === 'done' || s.status === 'failed';
  const solutionText = formatLine(fen, pvToSan(fen, s.solution));

  return (
    <div className="trainer">
      <div className="board-col">
        <Board
          id="trainer-board"
          fen={s.fen}
          orientation={orientation}
          movable={s.status === 'solving' && !s.checking ? side : null}
          onMove={(f, t, p) => { s.move(f, t, p); return true; }}
          arrows={s.arrows}
          marks={s.marks}
          lastMove={s.lastMove || lastMove}
        />
      </div>
      <aside className="side-col">
        <div className="card">
          <div className="lesson-kicker">{COLOR_NAME[side]} to move</div>
          <div className="lesson-q">{prompt}</div>
          {context && <div className="trainer-context">{context}</div>}
        </div>
        <div className="card">
          {!finished && (
            <>
              {s.checking && <p className="muted">Checking your move…</p>}
              {s.wrong && !s.checking && <p className="retry-note">{s.wrong.san} isn’t it. {s.attempts >= 2 ? 'Try a hint.' : 'Try again.'}</p>}
              {s.status === 'replying' && <p className="muted">Good — opponent replies…</p>}
              {s.idx > 0 && s.status === 'solving' && !s.wrong && <p className="good-note">Correct. Keep going.</p>}
              {hintText && <p className="hint-text">💡 {hintText}</p>}
              <div className="callout-actions">
                {s.status === 'revealing' && <p className="muted">Here’s how it goes…</p>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={onHint} disabled={s.status !== 'solving' || s.hintLevel >= maxHints || hint.loading}>
                  {hint.loading ? 'Thinking…' : s.hintLevel === maxHints - 1 ? 'Show the move' : s.hintLevel ? 'More help' : 'Hint'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={s.reveal} disabled={s.status !== 'solving'}>Show solution</button>
              </div>
            </>
          )}
          {finished && (
            <div className={s.status === 'done' ? 'result-good' : 'result-bad'}>
              <div className="lesson-kicker">{s.status === 'done' ? (s.attempts === 0 && s.hintLevel === 0 ? 'Solved ✓' : 'Solved with help') : 'Solution'}</div>
              <p className="line">{s.status === 'done' ? 'Your line: ' : ''}{solutionText}</p>
              {explanation && <div className="explain">{explanation}</div>}
              {footer}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
