import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Board from '../components/Board.jsx';
import { MoveList, Empty } from '../components/ui.jsx';
import { useStore } from '../lib/store.js';
import { href } from '../lib/router.js';
import { GRADES, whiteWin } from '../lib/evaluation.js';
import { planOf, describePlan } from '../lib/plan.js';
import { getEngine } from '../lib/engine.js';
import { go } from '../lib/router.js';
import { getController } from '../play/session.js';
import { getState } from '../lib/store.js';

/** Win-chance graph (from the learner's side) with one point per move they played. */
function EvalGraph({ plies, userColor, current, onSelect }) {
  const pts = plies.map((p, i) => ({ i, p })).filter(({ p }) => p.by === 'user' && p.scoreAfter);
  if (pts.length < 2) return null;
  const W = 560, H = 110;
  const x = (i) => (i / Math.max(1, plies.length - 1)) * W;
  const y = (p) => {
    const w = whiteWin(p.scoreAfter, userColor);
    const mine = userColor === 'w' ? w : 1 - w;
    return H - mine * H;
  };
  const d = pts.map(({ i, p }, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  return (
    <svg className="chart evalgraph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your winning chances through the game">
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="chart-grid" />
      <path d={`${d} L${x(pts[pts.length - 1].i)},${H} L${x(pts[0].i)},${H} Z`} className="chart-area" />
      <path d={d} className="chart-line" />
      {pts.filter(({ p }) => ['mistake', 'blunder'].includes(p.grade)).map(({ i, p }) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={5} className={`chart-dot dot-${p.grade}`} onClick={() => onSelect(i)}>
          <title>{`${p.san}: ${GRADES[p.grade].label}`}</title>
        </circle>
      ))}
      {current >= 0 && <line x1={x(current)} x2={x(current)} y1={0} y2={H} className="chart-cursor" />}
    </svg>
  );
}

export default function GameReviewView({ gameId }) {
  const game = useStore((s) => s.games.find((g) => g.id === gameId));
  const [idx, setIdx] = useState(-1);
  const [deep, setDeep] = useState(null);

  const plies = useMemo(() => game?.plies || [], [game]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input,select,textarea')) return;
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(-1, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(plies.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plies.length]);

  if (!game) return <div className="page-narrow"><Empty icon="?" title="Game not found"><a href={href('progress')}>Back to progress</a></Empty></div>;

  const startFen = plies[0]?.fenBefore || new Chess().fen();
  const cur = plies[idx];
  const fen = idx < 0 ? startFen : (plies[idx + 1]?.fenBefore || fenAfter(cur));
  const viewPly = plies[idx + 1]; // the move about to be played from this position
  const orientation = game.userColor === 'w' ? 'white' : 'black';
  const arrows = [];
  if (cur?.by === 'user' && cur.bestUci && cur.bestUci !== cur.uci && ['inaccuracy', 'mistake', 'blunder'].includes(cur.grade)) {
    arrows.push({ startSquare: cur.bestUci.slice(0, 2), endSquare: cur.bestUci.slice(2, 4), color: 'rgba(34,197,94,0.8)' });
  }
  const keyMoments = plies.map((p, i) => ({ p, i })).filter(({ p }) => p.by === 'user' && ['mistake', 'blunder'].includes(p.grade));

  const shown = deep?.idx === idx ? deep : null;
  async function analyse() {
    const at = idx;
    const pos = cur ? cur.fenBefore : startFen;
    setDeep({ idx: at, loading: true });
    const engine = getEngine();
    const res = await engine.analyze(pos, { depth: 18, multipv: 1, movetime: 6000 });
    if (!res?.lines[0]) { setDeep(null); return; }
    const plan = await planOf(engine, pos, res.lines[0].pv);
    setDeep({ idx: at, text: describePlan(plan, { userMove: cur?.by === 'user' ? cur.uci : undefined }) });
  }

  return (
    <div className="page-wide">
      <div className="review-top">
        <a className="back" href={href('progress')}>← Progress</a>
        <div className="callout-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { getController().dismiss(); go('play'); }}>＋ New game</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => rematch(game)}>Rematch vs {game.persona}</button>
        </div>
      </div>
      <header className="page-head compact">
        <h1>vs {game.persona} <small className="muted">· {new Date(game.date).toLocaleDateString()}</small></h1>
        <p className="lede"><span className={`result result-${game.result}`}>{game.result}</span> by {game.reason}{game.accuracy != null ? ` · accuracy ${game.accuracy}%` : ''}{game.opening ? ` · ${game.opening}` : ''}</p>
      </header>
      <div className="trainer">
        <div className="board-col">
          <Board id="review-board" fen={fen} orientation={orientation} arrows={arrows} lastMove={cur ? { from: cur.uci.slice(0, 2), to: cur.uci.slice(2, 4) } : null} />
          <div className="board-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx(-1)}>⏮</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => Math.max(-1, i - 1))}>◀</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => Math.min(plies.length - 1, i + 1))}>▶</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx(plies.length - 1)}>⏭</button>
          </div>
        </div>
        <aside className="side-col">
          <div className="card">
            <EvalGraph plies={plies} userColor={game.userColor} current={idx} onSelect={setIdx} />
            {cur ? (
              <div className="ply-info">
                <div className="lesson-kicker">{cur.by === 'user' ? 'You played' : `${game.persona} played`}</div>
                <div className="lesson-san">{cur.san} {cur.grade && GRADES[cur.grade] && <span className={`chip chip-${GRADES[cur.grade].tone}`}>{GRADES[cur.grade].label}</span>}</div>
                {cur.by === 'user' && cur.best && cur.best !== cur.san && ['inaccuracy', 'mistake', 'blunder'].includes(cur.grade) && <p>Best was <b>{cur.best}</b> (green arrow).</p>}
                {cur.why && <p>{cur.why}</p>}
              </div>
            ) : <p className="muted">Start position. Use ◀ ▶ or your arrow keys.</p>}
            {viewPly === undefined && cur && <p className="muted">Final position.</p>}
            <div className="callout-actions">
              <button type="button" className="btn btn-ghost btn-xs" onClick={analyse} disabled={shown?.loading}>{shown?.loading ? 'Analysing…' : 'What was best here?'}</button>
            </div>
            {shown?.text && <p className="reveal">{shown.text}</p>}
          </div>
          {keyMoments.length > 0 && (
            <div className="card">
              <h3 className="sub-title">Key moments</h3>
              <ul className="plain moments">
                {keyMoments.map(({ p, i }) => (
                  <li key={i}><button type="button" className="link" onClick={() => setIdx(i)}>{Math.floor(i / 2) + 1}. {p.san}</button> <span className={`chip chip-${GRADES[p.grade].tone}`}>{GRADES[p.grade].label}</span></li>
                ))}
              </ul>
              <p className="muted">These positions are already in your review deck.</p>
            </div>
          )}
          <div className="card moves-card">
            <MoveList plies={plies} startFen={startFen} current={idx} onSelect={setIdx} />
          </div>
          <details className="card pgn">
            <summary>PGN</summary>
            <textarea readOnly value={game.pgn} rows={6} onFocus={(e) => e.target.select()} />
          </details>
        </aside>
      </div>
    </div>
  );
}

/** Same opponent, strength and colour as the reviewed game; your current coaching settings. */
function rematch(game) {
  const { settings } = getState();
  getController().start({
    personaId: game.personaId, custom: settings.custom, elo: game.elo, userColor: game.userColor === 'b' ? 'black' : 'white',
    coachMode: settings.coachMode, threatPrompts: settings.threatPrompts,
  });
  go('play');
}

function fenAfter(ply) {
  const g = new Chess(ply.fenBefore);
  g.move({ from: ply.uci.slice(0, 2), to: ply.uci.slice(2, 4), promotion: ply.uci[4] });
  return g.fen();
}
