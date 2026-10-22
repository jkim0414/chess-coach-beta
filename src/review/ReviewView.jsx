import { useCallback, useMemo, useState } from 'react';
import { useStore, dueCards, reviewCard, getState } from '../lib/store.js';
import { openingRuns, courseById } from '../lib/courses.js';
import { autoRating, formatInterval } from '../lib/fsrs.js';
import { getEngine } from '../lib/engine.js';
import { href } from '../lib/router.js';
import { Empty, ProgressBar } from '../components/ui.jsx';
import { requestPattern } from '../puzzles/patternBus.js';
import { MOTIFS } from '../lib/explain.js';
import { uciToSan } from '../lib/chessutil.js';
import { engineAccepts } from '../trainer/useSolver.js';
import { hintProvider } from '../lib/plan.js';
import PositionTrainer from './PositionTrainer.jsx';
import { useNow } from '../lib/useNow.js';
import LineSession from '../openings/LineSession.jsx';

const SESSION_MAX = 30;
const DAY = 86400000;

function ago(ts, now) {
  const d = Math.floor((now - ts) / DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

function buildQueue(cards) {
  const due = dueCards(cards).sort((a, b) => a.sched.due - b.sched.due);
  const positions = due.filter((c) => c.type !== 'opening').map((c) => ({ kind: 'position', cardId: c.id }));
  const runs = openingRuns(due.filter((c) => c.type === 'opening'));
  // Interleave: alternating kinds beats blocks of the same thing.
  const q = [];
  let i = 0, j = 0;
  while ((i < positions.length || j < runs.length) && q.length < SESSION_MAX) {
    if (j < runs.length) q.push(runs[j++]);
    if (i < positions.length) q.push(positions[i++]);
    if (i < positions.length && q.length < SESSION_MAX) q.push(positions[i++]);
  }
  return q;
}

function Forecast({ cards, now }) {
  const days = Array.from({ length: 7 }, (_, d) => {
    const start = d === 0 ? -Infinity : now + (d - 1) * DAY;
    const end = now + d * DAY;
    return Object.values(cards).filter((c) => c.sched?.state !== 'new' && c.sched?.due > start && c.sched?.due <= end).length;
  });
  const max = Math.max(1, ...days);
  return (
    <div className="forecast" aria-label="Reviews due over the next week">
      {days.map((n, d) => (
        <div key={d} className="forecast-day">
          <div className="forecast-bar"><div style={{ height: `${(n / max) * 100}%` }} /></div>
          <span className="forecast-n">{n}</span>
          <span className="forecast-label">{d === 0 ? 'Now' : `+${d}d`}</span>
        </div>
      ))}
    </div>
  );
}

function PositionItem({ card, onDone, runKey }) {
  const [finished, setFinished] = useState(null);
  const now = useNow();
  const engine = getEngine();
  const accept = useMemo(() => (card.type === 'puzzle' ? undefined : (fen, uci) => engineAccepts(engine, fen, uci, card.type === 'tactic' ? 0.04 : 0.07)), [card, engine]);
  const getHints = useMemo(() => hintProvider(engine, card.type === 'tactic' ? card.motif : null), [engine, card.type, card.motif]);
  const onFinish = useCallback((r) => {
    const rating = autoRating({ correct: r.solved, hintsUsed: r.hintLevel, attempts: r.attempts, ms: r.ms, reps: card.sched?.reps || 0, slowMs: 60000, fastMs: 8000 });
    reviewCard(card.id, rating);
    const due = getState().cards[card.id]?.sched?.due;
    setFinished({ ...r, inMs: due ? due - Date.now() : 0 });
  }, [card]);
  const src = card.source;
  const context = src?.gameId
    ? <>From your game vs {src.opponent}, {ago(src.date, now)}. You played <b>{src.played}</b>.</>
    : src?.puzzleId ? <>Lichess puzzle {src.puzzleId} · rating {src.rating}</> : null;
  const solution = card.line?.length ? card.line : [card.answers[0]];
  return (
    <PositionTrainer
      runKey={runKey}
      fen={card.fen}
      orientation={card.orientation || 'white'}
      solution={solution}
      firstAnswers={card.answers || []}
      lastMove={card.lastMove}
      prompt={card.prompt || 'Find the best move.'}
      context={context}
      explanation={(
        <>
          {src?.why && <p><b>Why {src.played} was wrong:</b> {src.why}</p>}
          {card.explanation && <p><b>{card.type === 'tactic' ? 'The idea' : `Engine’s choice, ${uciToSan(card.fen, solution[0])}`}:</b> {card.explanation}</p>}
        </>
      )}
      accept={accept}
      getHints={getHints}
      onFinish={onFinish}
      footer={finished && (
        <div className="done-box">
          <p className="muted">Next review in {formatInterval(finished.inMs)}.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>Next</button>
        </div>
      )}
    />
  );
}

function LineItem({ run, onDone }) {
  const course = courseById(run.courseId);
  const line = course?.lineById.get(run.lineId);
  const [finished, setFinished] = useState(false);
  const onResult = useCallback((step, r) => {
    const id = `op:${course.id}:${step.epd}`;
    const c = getState().cards[id];
    if (c) reviewCard(id, autoRating({ correct: r.correct, ms: r.ms, reps: c.sched?.reps || 0 }));
  }, [course]);
  if (!line) return <Skip onSkip={onDone} />;
  return (
    <LineSession
      course={course}
      line={line}
      mode="recall"
      quiz={run.quiz}
      onResult={onResult}
      onDone={() => setFinished(true)}
      heading={<div className="trainer-mode">{course.name} · recall {run.quiz.size} move{run.quiz.size > 1 ? 's' : ''}</div>}
      footer={finished && <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>Next</button>}
    />
  );
}

export default function ReviewView() {
  const cards = useStore((s) => s.cards);
  const motifs = useStore((s) => s.stats.motifs);
  const [queue, setQueue] = useState(null);
  const [pos, setPos] = useState(0);
  const now = useNow();

  const due = dueCards(cards);
  const dueOpen = due.filter((c) => c.type === 'opening').length;
  const duePos = due.length - dueOpen;
  const upcoming = Object.values(cards).filter((c) => c.sched?.state !== 'new' && c.sched?.due > now).sort((a, b) => a.sched.due - b.sched.due)[0];
  const weakest = Object.entries(motifs).filter(([m, v]) => v.seen >= 2 && MOTIFS[m]?.theme).sort((a, b) => a[1].found / a[1].seen - b[1].found / b[1].seen)[0];

  if (queue) {
    const item = queue[pos];
    if (!item) {
      return (
        <div className="page-narrow">
          <Empty icon="✓" title="Session complete">
            <p>{queue.length} item{queue.length > 1 ? 's' : ''} reviewed. Cards you struggled with will come back soon; the rest move further out.</p>
            <div className="callout-actions">
              <button type="button" className="btn btn-primary" onClick={() => { setQueue(null); setPos(0); }}>Done</button>
              <a className="btn btn-ghost" href={href('play')}>Play a game</a>
            </div>
          </Empty>
        </div>
      );
    }
    const next = () => setPos((p) => p + 1);
    const key = `${pos}`;
    return (
      <div className="page-wide">
        <div className="session-bar">
          <span>{pos + 1} / {queue.length}</span>
          <ProgressBar value={pos / queue.length} label="Session progress" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQueue(null); setPos(0); }}>End session</button>
        </div>
        {item.kind === 'line'
          ? <LineItem key={key} run={item} onDone={next} />
          : cards[item.cardId]
            ? <PositionItem key={key} runKey={key} card={cards[item.cardId]} onDone={next} />
            : <Skip onSkip={next} />}
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <header className="page-head">
        <h1>Review</h1>
        <p className="lede">Spaced repetition of <em>your</em> positions: opening moves you’re learning, and the moments from your own games where you went wrong or found something good. Intervals adapt to how well you do — you never grade yourself.</p>
      </header>
      {due.length ? (
        <div className="card review-start">
          <div className="review-counts">
            <div><b>{dueOpen}</b><span>opening positions</span></div>
            <div><b>{duePos}</b><span>positions from games & puzzles</span></div>
          </div>
          <button type="button" className="btn btn-primary btn-big" onClick={() => { setQueue(buildQueue(getState().cards)); setPos(0); }}>Start review</button>
        </div>
      ) : (
        <Empty icon="☕" title="Nothing due right now">
          {upcoming ? <p>Next review in {formatInterval(upcoming.sched.due - now)}.</p> : <p>Your deck fills up as you play (mistakes and tactics from your games) and learn opening lines.</p>}
          <div className="callout-actions">
            <a className="btn btn-ghost" href={href('openings')}>Learn an opening line</a>
            <a className="btn btn-ghost" href={href('play')}>Play a game</a>
          </div>
        </Empty>
      )}
      <section className="card">
        <h2 className="section-title">Next 7 days</h2>
        <Forecast cards={cards} now={now} />
      </section>
      <section className="card pattern-card">
        <h2 className="section-title">Pattern practice</h2>
        <p>Real-game puzzles from Lichess, by theme. {weakest ? <>Your weakest pattern in games so far: <b>{MOTIFS[weakest[0]].name}</b> ({weakest[1].found}/{weakest[1].seen} found).</> : 'Play a few games and I’ll point you at the patterns you miss most.'}</p>
        <div className="callout-actions">
          {weakest && <button type="button" className="btn btn-primary btn-sm" onClick={() => requestPattern(MOTIFS[weakest[0]].theme)}>Practise {MOTIFS[weakest[0]].name.toLowerCase()}</button>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => requestPattern('fork')}>Forks</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => requestPattern('pin')}>Pins</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => requestPattern('hangingPiece')}>Loose pieces</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => requestPattern('mateIn2')}>Mate in 2</button>
        </div>
      </section>
    </div>
  );
}

function Skip({ onSkip }) {
  return <div className="card"><p>This card was removed.</p><button type="button" className="btn btn-primary btn-sm" onClick={onSkip}>Next</button></div>;
}
