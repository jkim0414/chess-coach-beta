import { useEffect, useRef } from 'react';
import { material } from '../lib/material.js';
import { GRADES, whiteWin, formatScore } from '../lib/evaluation.js';

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, children }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden><span className="toggle-thumb" /></span>
      <span>{children}</span>
    </label>
  );
}

export function GradeMark({ grade }) {
  if (!grade || !GRADES[grade]) return null;
  const g = GRADES[grade];
  if (['good', 'excellent'].includes(grade)) return null;
  return <span className={`grade grade-${g.tone}`} title={g.label}>{g.symbol}</span>;
}

/** Two-column move list. `showGrade(ply, i)` decides whether a ply's grade is visible. */
export function MoveList({ plies, startFen, current, onSelect, showGrade = () => true }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.querySelector('.is-current') || ref.current?.lastElementChild;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [plies.length, current]);
  const startBlack = startFen ? startFen.split(' ')[1] === 'b' : false;
  const startNum = startFen ? parseInt(startFen.split(' ')[5] || '1', 10) : 1;
  const rows = [];
  let i = 0;
  let num = startNum;
  if (startBlack && plies.length) { rows.push({ num, w: null, b: 0 }); i = 1; num++; }
  for (; i < plies.length; i += 2) { rows.push({ num, w: i, b: i + 1 < plies.length ? i + 1 : null }); num++; }
  const cell = (idx) => {
    if (idx === null) return <span className="mv mv-empty" />;
    const p = plies[idx];
    return (
      <button type="button" className={`mv ${current === idx ? 'is-current' : ''} ${p.by === 'user' ? 'by-user' : ''}`} onClick={onSelect ? () => onSelect(idx) : undefined} disabled={!onSelect}>
        {p.san}{showGrade(p, idx) && <GradeMark grade={p.grade} />}
      </button>
    );
  };
  if (!plies.length) return <div className="movelist movelist-empty">No moves yet.</div>;
  return (
    <div className="movelist" ref={ref}>
      {rows.map((r) => (
        <div className="mv-row" key={r.num}>
          <span className="mv-num">{r.num}.</span>
          {cell(r.w)}
          {cell(r.b)}
        </div>
      ))}
    </div>
  );
}

export function EvalBar({ score, turn, orientation }) {
  const w = score ? whiteWin(score, turn) : 0.5;
  const label = score ? formatScore(score, turn, 'w') : '';
  const flip = orientation === 'black';
  return (
    <div className={`evalbar ${flip ? 'is-flipped' : ''}`} aria-label={`Evaluation ${label}`}>
      <div className="evalbar-white" style={{ height: `${(w * 100).toFixed(1)}%` }} />
      <span className={`evalbar-label ${w >= 0.5 ? 'on-white' : 'on-black'}`}>{label}</span>
    </div>
  );
}

const SYMBOLS = { w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }, b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' } };

export function PlayerStrip({ name, color, fen, sub, thinking }) {
  const { taken, score } = material(fen);
  const theirs = taken[color === 'w' ? 'b' : 'w']; // what this player has captured
  const adv = color === 'w' ? score : -score;
  return (
    <div className="player">
      <span className={`player-dot ${color === 'w' ? 'is-white' : 'is-black'}`} aria-hidden />
      <span className="player-name">{name}</span>
      {sub && <span className="player-sub">{sub}</span>}
      {thinking && <span className="thinking" aria-label="thinking"><i /><i /><i /></span>}
      <span className="player-captured">
        {theirs.map((t, i) => <span key={i}>{SYMBOLS[color === 'w' ? 'b' : 'w'][t]}</span>)}
        {adv > 0 && <b>+{adv}</b>}
      </span>
    </div>
  );
}

export function ProgressBar({ value, tone = 'accent', label }) {
  return (
    <div className={`bar bar-${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon" aria-hidden>{icon}</div>}
      <h3>{title}</h3>
      <div className="empty-body">{children}</div>
    </div>
  );
}
