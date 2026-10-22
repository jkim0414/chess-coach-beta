import { courseById, courseProgress, lineStatus } from '../lib/courses.js';
import { useStore, setCourseActive } from '../lib/store.js';
import { href, go } from '../lib/router.js';
import { ProgressBar, Empty } from '../components/ui.jsx';

const LEVEL_TONE = ['new', 'learning', 'young', 'strong', 'mastered'];

export default function CourseView({ courseId }) {
  const course = courseById(courseId);
  const cards = useStore((s) => s.cards);
  const state = useStore((s) => s.courses[courseId]);
  if (!course) return <div className="page-narrow"><Empty icon="?" title="Course not found"><a href={href('openings')}>Back to openings</a></Empty></div>;

  const p = courseProgress(course, cards);
  const statuses = new Map(course.lines.map((l) => [l.id, lineStatus(course, l, cards)]));
  const nextLine = course.lines.find((l) => !statuses.get(l.id).learned && !l.trap) || course.lines.find((l) => !statuses.get(l.id).learned);
  const dueLines = course.lines.filter((l) => statuses.get(l.id).due > 0);

  return (
    <div className="page-wide course">
      <a className="back" href={href('openings')}>← Openings</a>
      <header className="course-head">
        <div>
          <div className="course-side">{course.side === 'white' ? '♔ You play White' : '♚ You play Black'} · {course.level}</div>
          <h1>{course.name}</h1>
          <p className="lede">{course.tagline}</p>
        </div>
        <div className="course-head-side">
          <ProgressBar value={p.score} label="Mastery" />
          <div className="mastery-legend">
            {['New', 'Learning', 'Young', 'Strong', 'Mastered'].map((l, i) => (
              <span key={l} className={`lvl lvl-${LEVEL_TONE[i]}`}>{p.counts[i]} {l.toLowerCase()}</span>
            ))}
          </div>
          <label className="course-active">
            <input type="checkbox" checked={!!state?.active} onChange={(e) => setCourseActive(course.id, e.target.checked)} />
            In my repertoire (checked during games)
          </label>
        </div>
      </header>

      <div className="course-actions">
        {nextLine && <button type="button" className="btn btn-primary" onClick={() => go('openings', course.id, 'learn', nextLine.id)}>Learn next line: {nextLine.name}</button>}
        {dueLines.length > 0 && <a className="btn btn-ghost" href={href('review')}>Review {p.due} due position{p.due > 1 ? 's' : ''}</a>}
      </div>

      <div className="course-body">
        <section className="course-overview card">
          {course.overview.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
          <h3>Key ideas</h3>
          <ul className="ideas">
            {course.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </section>

        <section className="chapters">
          {course.groups.map((g) => (
            <div key={g.name} className="chapter">
              <h3 className="chapter-title">{g.name}</h3>
              <ul className="line-list">
                {g.lines.map((l) => {
                  const st = statuses.get(l.id);
                  return (
                    <li key={l.id} className="line-row">
                      <div className="line-info">
                        <span className="line-name">{l.name}</span>
                        <span className="line-moves">{l.steps.filter((x) => x.learner).length} moves to know{l.trap ? ' · trap' : ''}</span>
                      </div>
                      <span className={`lvl lvl-${LEVEL_TONE[st.level]}`}>{st.label}{st.due ? ` · ${st.due} due` : ''}</span>
                      <div className="line-btns">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => go('openings', course.id, 'learn', l.id)}>{st.learned ? 'Revisit' : 'Learn'}</button>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => go('openings', course.id, 'drill', l.id)} disabled={!st.learned && st.label === 'New'}>Drill</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
