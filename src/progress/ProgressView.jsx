import { useRef, useState } from 'react';
import { useStore, exportData, importData, resetAll, dueCards } from '../lib/store.js';
import { COURSES, courseProgress } from '../lib/courses.js';
import { MOTIFS } from '../lib/explain.js';
import { themeName } from '../puzzles/lichess.js';
import { requestPattern } from '../puzzles/patternBus.js';
import { href } from '../lib/router.js';
import { ProgressBar, Empty } from '../components/ui.jsx';
import { mastery } from '../lib/fsrs.js';

function Tile({ value, label, sub }) {
  return (
    <div className="tile">
      <b>{value}</b>
      <span>{label}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/** Accuracy over recent games — a plain line chart with the game list as its table. */
function AccuracyChart({ games }) {
  const pts = games.filter((g) => g.accuracy != null).slice(0, 20).reverse();
  if (pts.length < 2) return <p className="muted">Play a couple of games to see your accuracy trend.</p>;
  const W = 560, H = 140, P = 24;
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (a) => H - P - ((a - 40) / 60) * (H - 2 * P);
  const d = pts.map((g, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Math.max(40, g.accuracy)).toFixed(1)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Accuracy over your last ${pts.length} games`}>
      {[50, 70, 90].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={4} y={y(v) + 4} className="chart-tick">{v}</text>
        </g>
      ))}
      <path d={d} className="chart-line" />
      {pts.map((g, i) => (
        <circle key={g.id} cx={x(i)} cy={y(Math.max(40, g.accuracy))} r={4} className={`chart-dot dot-${g.result}`}>
          <title>{`${new Date(g.date).toLocaleDateString()} vs ${g.persona}: ${g.accuracy}% (${g.result})`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function ProgressView() {
  const state = useStore((s) => s);
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const { games, stats, cards, courses } = state;
  const results = games.reduce((a, g) => ({ ...a, [g.result]: (a[g.result] || 0) + 1 }), {});
  const recent = games.filter((g) => g.accuracy != null).slice(0, 10);
  const avgAcc = recent.length ? Math.round(recent.reduce((a, g) => a + g.accuracy, 0) / recent.length) : null;
  const threatPct = stats.threat.asked ? Math.round((100 * stats.threat.correct) / stats.threat.asked) : null;
  const days = Object.keys(stats.days).sort();
  let streak = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    const key = d.toISOString().slice(0, 10);
    if (stats.days[key]) streak++;
    else if (streak || key !== new Date().toISOString().slice(0, 10)) break;
  }
  const allCards = Object.values(cards);
  const mastered = allCards.filter((c) => mastery(c.sched).level >= 3).length;
  const motifRows = Object.entries(stats.motifs).filter(([m]) => MOTIFS[m]).sort((a, b) => b[1].seen - a[1].seen);
  const puzzleRows = Object.entries(stats.puzzles).sort((a, b) => b[1].tried - a[1].tried);
  const phases = stats.phases;
  const phaseMax = Math.max(1, ...Object.values(phases));
  const activeCourses = COURSES.filter((c) => courses[c.id]?.active);

  function doExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chess-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function doImport(file) {
    try { importData(await file.text()); setMsg('Backup restored.'); } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="page-wide">
      <header className="page-head">
        <h1>Progress</h1>
        <p className="lede">What’s improving, what isn’t, and where to aim practice next.</p>
      </header>

      <div className="tiles">
        <Tile value={games.length} label="games" sub={games.length ? `${results.win || 0}W · ${results.draw || 0}D · ${results.loss || 0}L` : null} />
        <Tile value={avgAcc != null ? `${avgAcc}%` : '—'} label="accuracy" sub="last 10 games" />
        <Tile value={threatPct != null ? `${threatPct}%` : '—'} label="threats spotted" sub={stats.threat.asked ? `${stats.threat.correct}/${stats.threat.asked} · streak ${stats.threat.streak}` : 'no threat checks yet'} />
        <Tile value={streak} label="day streak" sub={`${days.length} day${days.length === 1 ? '' : 's'} of review`} />
        <Tile value={dueCards(cards).length} label="due now" sub={`${allCards.length} cards · ${mastered} strong`} />
      </div>

      <div className="progress-grid">
        <section className="card">
          <h2 className="section-title">Accuracy</h2>
          <AccuracyChart games={games} />
        </section>

        <section className="card">
          <h2 className="section-title">Tactics in your games</h2>
          {motifRows.length ? (
            <table className="table">
              <thead><tr><th>Pattern</th><th>Found</th><th /><th /></tr></thead>
              <tbody>
                {motifRows.map(([m, v]) => (
                  <tr key={m}>
                    <td>{MOTIFS[m].name}</td>
                    <td>{v.found}/{v.seen}</td>
                    <td className="cell-bar"><ProgressBar value={v.found / v.seen} tone={v.found / v.seen < 0.5 ? 'bad' : 'good'} label={`${MOTIFS[m].name} found rate`} /></td>
                    <td>{MOTIFS[m].theme && <button type="button" className="btn btn-ghost btn-xs" onClick={() => requestPattern(MOTIFS[m].theme)}>Practise</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">When a game contains a winning tactic, I track whether you found it. Patterns you miss show up here.</p>}
        </section>

        <section className="card">
          <h2 className="section-title">Where mistakes happen</h2>
          {Object.values(phases).some(Boolean) ? (
            <div className="phase-bars">
              {['opening', 'middlegame', 'endgame'].map((p) => (
                <div key={p} className="phase-row">
                  <span>{p}</span>
                  <ProgressBar value={(phases[p] || 0) / phaseMax} tone="bad" label={`${p} mistakes`} />
                  <b>{phases[p] || 0}</b>
                </div>
              ))}
            </div>
          ) : <p className="muted">No mistakes recorded yet.</p>}
          {puzzleRows.length > 0 && (
            <>
              <h3 className="sub-title">Pattern practice</h3>
              <ul className="plain">
                {puzzleRows.map(([t, v]) => <li key={t}>{themeName(t)}: {v.solved}/{v.tried} clean</li>)}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Repertoire</h2>
          {activeCourses.length ? activeCourses.map((c) => {
            const p = courseProgress(c, cards);
            return (
              <a key={c.id} className="rep-row" href={href('openings', c.id)}>
                <span>{c.name}</span>
                <ProgressBar value={p.score} label={`${c.name} mastery`} />
                <small>{p.learned}/{p.total} positions{p.due ? ` · ${p.due} due` : ''}</small>
              </a>
            );
          }) : <p className="muted">No courses in your repertoire yet. <a href={href('openings')}>Choose one →</a></p>}
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Recent games</h2>
        {games.length ? (
          <table className="table games-table">
            <thead><tr><th>Date</th><th>Opponent</th><th>Colour</th><th>Opening</th><th>Result</th><th>Accuracy</th><th /></tr></thead>
            <tbody>
              {games.slice(0, 30).map((g) => (
                <tr key={g.id}>
                  <td>{new Date(g.date).toLocaleDateString()}</td>
                  <td>{g.persona} <small className="muted">{g.elo}</small></td>
                  <td>{g.userColor === 'w' ? 'White' : 'Black'}</td>
                  <td>{g.opening || '—'}</td>
                  <td><span className={`result result-${g.result}`}>{g.result}</span></td>
                  <td>{g.accuracy != null ? `${g.accuracy}%` : '—'}</td>
                  <td><a href={href('game', g.id)}>Review</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty icon="♟" title="No games yet"><a className="btn btn-primary" href={href('play')}>Play your first game</a></Empty>}
      </section>

      <section className="card data-card">
        <h2 className="section-title">Your data</h2>
        <p className="muted">Everything is stored in this browser. Export a backup to move it to another device.</p>
        <div className="callout-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={doExport}>Export backup</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Import backup</button>
          <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => { if (window.confirm('Erase all games, cards and progress? This cannot be undone.')) resetAll(); }}>Reset everything</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {msg && <p className="notice">{msg}</p>}
      </section>
    </div>
  );
}
