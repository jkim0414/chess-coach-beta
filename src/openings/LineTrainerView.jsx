import { useCallback, useState } from 'react';
import { courseById, cardForStep, cardIdFor, lineStatus } from '../lib/courses.js';
import { upsertCard, reviewCard, markLineLearned, getState, setCourseActive, useStore } from '../lib/store.js';
import { autoRating, formatInterval } from '../lib/fsrs.js';
import { href, go } from '../lib/router.js';
import { Empty } from '../components/ui.jsx';
import { useNow } from '../lib/useNow.js';
import LineSession from './LineSession.jsx';

/** Learn = walkthrough with notes, then an immediate recall pass (the first retrieval). Drill = recall only. */
export default function LineTrainerView({ courseId, mode, lineId }) {
  const course = courseById(courseId);
  const line = course?.lineById.get(lineId);
  const [phase, setPhase] = useState(mode === 'learn' ? 'learn' : 'recall');
  const [run, setRun] = useState(0);
  const [result, setResult] = useState(null);
  const cards = useStore((s) => s.cards);
  const now = useNow();

  const onResult = useCallback((step, r) => {
    if (!course) return;
    const id = cardIdFor(course.id, step.epd);
    const existing = getState().cards[id];
    if (!existing) upsertCard(cardForStep(course, step, line));
    reviewCard(id, autoRating({ correct: r.correct, ms: r.ms, reps: existing?.sched?.reps || 0 }));
  }, [course, line]);

  const onDone = useCallback((results) => {
    if (phase === 'learn') {
      setPhase('recall');
      setRun((x) => x + 1);
      return;
    }
    markLineLearned(course.id, line.id);
    if (!getState().courses[course.id]?.active) setCourseActive(course.id, true);
    const correct = results.filter((x) => x.correct).length;
    setResult({ correct, total: results.length });
  }, [phase, course, line]);

  if (!course || !line) return <div className="page-narrow"><Empty icon="?" title="Line not found"><a href={href('openings')}>Back to openings</a></Empty></div>;

  const idx = course.lines.indexOf(line);
  const next = course.lines.slice(idx + 1).find((l) => !lineStatus(course, l, cards).learned);
  const scheds = line.steps.filter((s) => s.learner).map((s) => cards[cardIdFor(course.id, s.epd)]?.sched).filter(Boolean);
  const relearn = scheds.filter((x) => x.state === 'relearning').length;
  const nextDue = Math.min(...scheds.filter((x) => x.state === 'review').map((x) => x.due));

  const footer = result && (
    <div className="done-box">
      <p><b>{result.correct}/{result.total}</b> recalled first time.</p>
      <p className="muted">
        {relearn > 0 && `${relearn === 1 ? 'The move you missed comes' : `The ${relearn} moves you missed come`} back in a few minutes. `}
        {Number.isFinite(nextDue) && `${relearn ? 'The rest' : 'This line'}: next review in ${formatInterval(nextDue - now)}.`}
      </p>
      <div className="callout-actions">
        {next && <button type="button" className="btn btn-primary btn-sm" onClick={() => { setResult(null); setPhase('learn'); setRun((x) => x + 1); go('openings', course.id, 'learn', next.id); }}>Next line</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setPhase('recall'); setRun((x) => x + 1); }}>Drill again</button>
        <a className="btn btn-ghost btn-sm" href={href('openings', course.id)}>Back to course</a>
      </div>
    </div>
  );

  const heading = (
    <>
      <a className="back" href={href('openings', course.id)}>← {course.name}</a>
      <div className="trainer-mode">{phase === 'learn' ? 'Learn · watch and play each move' : mode === 'learn' ? 'Now from memory' : 'Drill · from memory'}</div>
    </>
  );

  return (
    <div className="page-wide">
      <LineSession
        key={`${line.id}-${phase}-${run}`}
        course={course}
        line={line}
        mode={phase === 'learn' ? 'learn' : 'recall'}
        onResult={phase === 'learn' ? undefined : onResult}
        onDone={onDone}
        heading={heading}
        footer={footer}
      />
    </div>
  );
}
