import { useState } from 'react';
import Board from '../components/Board.jsx';
import { MoveList, EvalBar, PlayerStrip } from '../components/ui.jsx';
import { useStore } from '../lib/store.js';
import { href } from '../lib/router.js';
import { strengthLabel } from '../lib/opponent.js';
import { GRADES } from '../lib/evaluation.js';
import GameSetup from './GameSetup.jsx';
import CoachPanel from './CoachPanel.jsx';
import { useGame } from './session.js';

function Summary({ s, c, onNew }) {
  const sum = s.summary;
  if (!sum) return null;
  const order = ['best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];
  return (
    <div className="card summary">
      <div className="summary-head">
        <div>
          <div className={`result result-${sum.outcome}`}>{sum.outcome === 'win' ? 'Win' : sum.outcome === 'loss' ? 'Loss' : 'Draw'}</div>
          <div className="muted">by {sum.reason}</div>
        </div>
        {sum.accuracy != null && <div className="accuracy"><b>{sum.accuracy}</b><span>accuracy</span></div>}
      </div>
      <div className="grade-counts">
        {order.filter((g) => sum.counts[g]).map((g) => (
          <span key={g} className={`chip chip-${GRADES[g].tone}`}>{GRADES[g].label} {sum.counts[g]}</span>
        ))}
      </div>
      {sum.cards > 0 && <p className="muted">{sum.cards} position{sum.cards > 1 ? 's' : ''} from this game went into your review deck.</p>}
      <div className="callout-actions">
        <a className="btn btn-primary btn-sm" href={href('game', s.gameId)}>Review the game</a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.start(s.config)}>Rematch</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onNew}>New opponent</button>
      </div>
    </div>
  );
}

export default function PlayView() {
  const [s, c] = useGame();
  const showEval = useStore((st) => st.settings.showEval);
  const [flipped, setFlipped] = useState(false);
  const [setup, setSetup] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saved] = useState(() => c.resumable());
  const resumable = dismissed ? null : saved;

  if (s.status === 'idle' || setup) {
    return (
      <div className="page-narrow">
        <header className="page-head">
          <h1>Play</h1>
          <p className="lede">Real games, with a coach who stops you at the moments that matter — then turns them into practice.</p>
        </header>
        {s.status === 'idle' && resumable && (
          <div className="card resume">
            <div>
              <div className="lesson-kicker">Unfinished game</div>
              <p>vs {resumable.personaName} · {resumable.moves} moves played</p>
            </div>
            <div className="callout-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => c.resume()}>Resume</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { c.discardLive(); setDismissed(true); }}>Discard</button>
            </div>
          </div>
        )}
        <GameSetup onStart={(config) => { setSetup(false); setFlipped(false); c.start(config); window.scrollTo(0, 0); }} />
      </div>
    );
  }

  const userIsWhite = s.userColor === 'w';
  const orientation = (userIsWhite !== flipped) ? 'white' : 'black';
  const bottomColor = orientation === 'white' ? 'w' : 'b';
  const topColor = bottomColor === 'w' ? 'b' : 'w';
  const nameOf = (col) => (col === s.userColor ? 'You' : s.persona.name);
  const subOf = (col) => (col === s.userColor ? null : `${s.config.elo} · ${strengthLabel(s.config.elo)}`);
  const picking = s.active?.kind === 'threat' && s.active.state === 'asking';
  const movable = c.canMove() ? s.userColor : null;
  const lastIdx = s.plies.length - 1;

  return (
    <div className="play">
      <div className="board-col">
        <PlayerStrip name={nameOf(topColor)} sub={subOf(topColor)} color={topColor} fen={s.fen} thinking={s.thinking && topColor !== s.userColor} />
        <div className={`board-frame ${showEval ? 'with-eval' : ''}`}>
          {showEval && <EvalBar score={s.evalScore?.score} turn={s.evalScore?.turn} orientation={orientation} />}
          <Board
            id="play-board"
            fen={s.fen}
            orientation={orientation}
            movable={movable}
            onMove={(f, t, p) => c.userMove(f, t, p)}
            onPick={picking ? (sq) => c.answerThreat(sq) : undefined}
            arrows={s.arrows}
            marks={s.marks}
            lastMove={s.lastMove}
          />
        </div>
        <PlayerStrip name={nameOf(bottomColor)} sub={subOf(bottomColor)} color={bottomColor} fen={s.fen} thinking={s.thinking && bottomColor !== s.userColor} />
        <div className="board-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.takeBack()} disabled={!s.plies.some((p) => p.by === 'user')}>↶ Take back</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFlipped((f) => !f)}>⇅ Flip</button>
          {s.status === 'playing'
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm('Resign this game?')) c.resign(); }}>⚑ Resign</button>
            : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { c.stop(); setSetup(true); }}>＋ New game</button>
        </div>
      </div>

      <aside className="side-col">
        {s.opening && <div className="opening-name" title={s.opening.idea}>{s.opening.eco ? <span className="eco">{s.opening.eco}</span> : null}{s.opening.name}</div>}
        {s.status === 'over' && <Summary s={s} c={c} onNew={() => setSetup(true)} />}
        <CoachPanel s={s} c={c} />
        <div className="card moves-card">
          <MoveList
            plies={s.plies}
            startFen={s.config?.fen}
            current={lastIdx}
            showGrade={(p, i) => s.status === 'over' || (s.config?.coachMode !== 'exam' && (p.by === 'user' || i < lastIdx))}
          />
        </div>
      </aside>
    </div>
  );
}
