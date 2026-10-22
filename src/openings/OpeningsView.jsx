import { COURSES, courseProgress } from '../lib/courses.js';
import { useStore, setCourseActive } from '../lib/store.js';
import { href } from '../lib/router.js';
import { ProgressBar, Empty } from '../components/ui.jsx';

function CourseCard({ course, cards, state }) {
  const p = courseProgress(course, cards);
  const learnedLines = Object.keys(state?.learned || {}).length;
  return (
    <article className={`course-card ${state?.active ? 'is-active' : ''}`}>
      <a className="course-card-main" href={href('openings', course.id)}>
        <div className="course-side">{course.side === 'white' ? '♔ White' : '♚ Black'} · {course.level}</div>
        <h3>{course.name}</h3>
        <p>{course.tagline}</p>
        <ProgressBar value={p.score} label={`${course.name} mastery`} />
        <div className="course-meta">
          <span>{learnedLines}/{course.lines.length} lines learned</span>
          {p.due > 0 && <span className="chip chip-mistake">{p.due} due</span>}
        </div>
      </a>
      <label className="course-active">
        <input type="checkbox" checked={!!state?.active} onChange={(e) => setCourseActive(course.id, e.target.checked)} />
        In my repertoire
      </label>
    </article>
  );
}

export default function OpeningsView() {
  const cards = useStore((s) => s.cards);
  const courses = useStore((s) => s.courses);
  const groups = [['white', 'As White'], ['black', 'As Black']];
  return (
    <div className="page-wide">
      <header className="page-head">
        <h1>Openings</h1>
        <p className="lede">
          Learn a repertoire one line at a time, recall it on spaced-repetition schedules, then meet it in real games.
          Courses marked “in my repertoire” are checked live while you play — and the Repertoire Sparring opponent steers into the lines you’re due to review.
        </p>
      </header>
      {!COURSES.length && <Empty icon="📖" title="No courses installed">Course files live in <code>src/data/courses</code>.</Empty>}
      {groups.map(([side, title]) => {
        const list = COURSES.filter((c) => c.side === side);
        if (!list.length) return null;
        return (
          <section key={side} className="course-section">
            <h2 className="section-title">{title}</h2>
            <div className="course-grid">
              {list.map((c) => <CourseCard key={c.id} course={c} cards={cards} state={courses[c.id]} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
