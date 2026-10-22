import Board from '../components/Board.jsx';
import { ProgressBar } from '../components/ui.jsx';
import { useLineRunner } from '../trainer/useLineRunner.js';
import { formatLine } from '../lib/chessutil.js';

/**
 * One pass through an opening line. `mode` is 'learn' (each move shown, then played)
 * or 'recall' (quizzed). `quiz`: Set of position keys to quiz in recall mode (null = all).
 */
export default function LineSession({ course, line, mode, quiz = null, onResult, onDone, heading, footer }) {
  const r = useLineRunner({ line, mode, quiz, onResult, onDone });
  const step = r.step;
  const played = line.steps.slice(0, r.idx).map((x) => x.san);
  const moveText = played.length ? formatLine(line.steps[0].fen, played) : 'Starting position';
  const learnerColor = course.side === 'white' ? 'w' : 'b';

  let panel;
  if (r.phase === 'show' && step) {
    panel = (
      <div className="lesson lesson-show">
        {r.noteSan && r.noteColor !== learnerColor && r.note && (
          <p className="lesson-prev"><b>{r.noteColor === 'b' ? '…' : ''}{r.noteSan}</b> — {r.note}</p>
        )}
        <div className="lesson-kicker">Your move</div>
        <div className="lesson-san">{step.san}</div>
        <p>{step.note || 'Play it on the board.'}</p>
        <p className="muted">Play it on the board to continue.</p>
      </div>
    );
  } else if (r.phase === 'ask') {
    panel = (
      <div className="lesson lesson-ask">
        <div className="lesson-kicker">Recall</div>
        <div className="lesson-q">What’s your move?</div>
        {r.note && <p className="muted">Last: {r.noteColor === 'b' ? '…' : ''}{r.noteSan} — {r.note}</p>}
      </div>
    );
  } else if (r.phase === 'correct-it' && step) {
    panel = (
      <div className="lesson lesson-wrong">
        <div className="lesson-kicker">Not {r.wrong}</div>
        <div className="lesson-san">{step.san}</div>
        <p>{step.note || 'This is your repertoire move.'}</p>
        <p className="muted">Play it to lock it in. This position comes back sooner.</p>
      </div>
    );
  } else if (r.done) {
    panel = (
      <div className="lesson lesson-done">
        <div className="lesson-kicker">Line complete</div>
        {line.summary && <p>{line.summary}</p>}
        {footer}
      </div>
    );
  } else {
    panel = (
      <div className="lesson">
        {r.noteSan ? <><div className="lesson-kicker">{r.noteColor === learnerColor ? 'You played' : 'They played'} {r.noteColor === 'b' ? '…' : ''}{r.noteSan}</div><p>{r.note || ''}</p></> : <p className="muted">Here we go…</p>}
      </div>
    );
  }

  return (
    <div className="trainer">
      <div className="board-col">
        <Board
          id={`line-${course.id}`}
          fen={r.fen}
          orientation={course.side}
          movable={['show', 'ask', 'correct-it'].includes(r.phase) ? learnerColor : null}
          onMove={(f, t, p) => r.move(f, t, p)}
          arrows={r.arrows}
          lastMove={r.lastMove}
        />
      </div>
      <aside className="side-col">
        <div className="card trainer-head">
          {heading}
          <div className="trainer-line">{line.name}</div>
          <ProgressBar value={r.done ? 1 : r.progress} label="Progress through line" />
          {mode === 'recall' && r.total > 0 && <div className="muted">{r.correctCount}/{r.total} recalled</div>}
        </div>
        <div className="card">{panel}</div>
        <div className="card line-text"><span className="muted">Moves:</span> {moveText}</div>
      </aside>
    </div>
  );
}
