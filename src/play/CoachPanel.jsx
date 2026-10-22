import { useState } from 'react';
import { COLOR_NAME } from '../lib/chessutil.js';
import { requestPattern } from '../puzzles/patternBus.js';

const ICONS = { best: '★', good: '✓', book: '📖', inaccuracy: '?!', mistake: '?', blunder: '??', info: '•', threat: '⚠', tactic: '⚡', opening: '♜' };

function Callout({ s, c }) {
  const a = s.active;
  const opp = COLOR_NAME[s.userColor === 'w' ? 'b' : 'w'];
  if (!a) {
    let text = 'Your move.';
    if (s.status === 'over') return null;
    if (s.thinking) text = `${s.persona?.name || 'Opponent'} is thinking…`;
    else if (s.locked) text = 'Checking the position…';
    else if (s.grading) text = 'Checking your move…';
    return (
      <div className="callout callout-idle">
        <p>{text}</p>
        {s.turn === 'user' && !s.locked && !s.grading && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.hint()} disabled={!s.analysisReady || s.hintPending}>{s.hintPending ? 'Thinking…' : 'Hint'}</button>
        )}
      </div>
    );
  }
  if (a.kind === 'threat') {
    if (a.state === 'asking') {
      return (
        <div className="callout callout-threat" role="alert">
          <div className="callout-kicker">Threat check</div>
          <h3>What is {opp} threatening?</h3>
          <p>Click the square or piece in danger (or the piece that would strike).</p>
          <div className="callout-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.answerThreat(null)}>I don’t see it — show me</button>
          </div>
        </div>
      );
    }
    return (
      <div className={`callout ${a.correct ? 'callout-good' : 'callout-threat'}`}>
        <div className="callout-kicker">{a.correct ? 'Threat spotted ✓' : 'The threat'}</div>
        <p>{a.threat.text}</p>
        <p className="muted">Now find a move that deals with it.</p>
        <div className="callout-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.hint()} disabled={!s.analysisReady || s.hintPending}>{s.hintPending ? 'Thinking…' : 'Hint'}</button>
        </div>
      </div>
    );
  }
  if (a.kind === 'moment') {
    return (
      <div className={`callout ${a.type === 'defend' ? 'callout-threat' : 'callout-tactic'}`} role="status">
        <div className="callout-kicker">{a.type === 'hint' ? 'Hint' : 'Critical moment'}</div>
        {a.title && a.type !== 'hint' && <h3>{a.title}</h3>}
        {a.text && <p>{a.text}</p>}
        {a.hintText && <p className="hint-text">💡 {a.hintText}</p>}
        <div className="callout-actions">
          {(a.hintLevel || 0) < 3 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.hint()} disabled={s.hintPending}>{s.hintPending ? 'Thinking…' : a.hintLevel === 2 ? 'Show the move' : a.hintLevel ? 'More help' : 'Hint'}</button>}
        </div>
      </div>
    );
  }
  if (a.kind === 'intervention') {
    const decide = a.mode === 'decide';
    return (
      <div className={`callout ${a.reason === 'repertoire' ? 'callout-book' : a.reason === 'missed' ? 'callout-tactic' : 'callout-bad'}`} role="alert">
        <div className="callout-kicker">{decide ? 'Hold on' : 'Your turn again'}</div>
        <h3>{a.title}</h3>
        {decide && <p>{a.why}</p>}
        {decide && a.refutation && <p className="refutation">What happens next: <span>{a.refutation}</span></p>}
        {!decide && <p>{a.reason === 'repertoire' ? 'Play your repertoire move.' : a.reason === 'missed' ? 'Find the strongest move.' : 'Find a better move.'}</p>}
        {a.retryNote && <p className="retry-note">{a.retryNote}</p>}
        {a.hintText && <p className="hint-text">💡 {a.hintText}</p>}
        <div className="callout-actions">
          {decide && <button type="button" className="btn btn-primary btn-sm" onClick={() => c.retry()}>Try again</button>}
          {!decide && (a.hintLevel || 0) < 3 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.hint()} disabled={s.hintPending}>{s.hintPending ? 'Thinking…' : a.hintLevel === 2 ? 'Show the move' : a.hintLevel ? 'More help' : 'Hint'}</button>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.showMe()}>Show me</button>
          {decide && <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.playOn()}>Keep my move</button>}
        </div>
      </div>
    );
  }
  if (a.kind === 'drill') {
    return (
      <div className="callout callout-tactic">
        <div className="callout-kicker">Finish the combination</div>
        <p>{a.text}</p>
        <div className="callout-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => c.hint()} disabled={s.turn !== 'user'}>Show the move</button>
        </div>
      </div>
    );
  }
  return null;
}

function FeedItem({ e }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`feed-item tone-${e.tone}`}>
      <span className="feed-icon" aria-hidden>{ICONS[e.tone] || '•'}</span>
      <div className="feed-body">
        <div className="feed-title">{e.title}</div>
        {e.text && <div className="feed-text">{e.text}</div>}
        {e.reveal && (open ? <div className="feed-text reveal">{e.reveal}</div> : <button type="button" className="link" onClick={() => setOpen(true)}>{e.revealLabel || 'Why?'}</button>)}
        {e.actions?.map((x) => (
          <button key={x.label} type="button" className="btn btn-ghost btn-xs" onClick={() => x.action === 'pattern' && requestPattern(x.theme)}>🎯 {x.label}</button>
        ))}
      </div>
    </li>
  );
}

export default function CoachPanel({ s, c }) {
  const items = [...s.feed].reverse();
  return (
    <div className="coach">
      <Callout s={s} c={c} />
      <ul className="feed" aria-label="Coach notes">
        {items.map((e) => <FeedItem key={e.id} e={e} />)}
      </ul>
    </div>
  );
}
