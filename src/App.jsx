import { useEffect, useState } from 'react';
import { useRoute, href } from './lib/router.js';
import { useStore, dueCards } from './lib/store.js';
import PlayView from './play/PlayView.jsx';
import OpeningsView from './openings/OpeningsView.jsx';
import CourseView from './openings/CourseView.jsx';
import LineTrainerView from './openings/LineTrainerView.jsx';
import ReviewView from './review/ReviewView.jsx';
import ProgressView from './progress/ProgressView.jsx';
import GameReviewView from './progress/GameReviewView.jsx';
import PatternDrawer from './puzzles/PatternDrawer.jsx';
import { onPatternRequest } from './puzzles/patternBus.js';
import './App.css';

const TABS = [
  { id: 'play', label: 'Play', icon: '♟' },
  { id: 'openings', label: 'Openings', icon: '📖' },
  { id: 'review', label: 'Review', icon: '↻' },
  { id: 'progress', label: 'Progress', icon: '📈' },
];

function useTick(ms) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(t); }, [ms]);
}

export default function App() {
  const route = useRoute();
  const tab = route[0] || 'play';
  useTick(60000);
  const due = useStore((s) => dueCards(s.cards).length);
  const [pattern, setPattern] = useState(null);
  useEffect(() => onPatternRequest(setPattern), []);

  let view;
  if (tab === 'openings' && route[1] && route[2]) view = <LineTrainerView key={route.join("/")} courseId={route[1]} mode={route[2]} lineId={route[3]} />;
  else if (tab === 'openings' && route[1]) view = <CourseView courseId={route[1]} />;
  else if (tab === 'openings') view = <OpeningsView />;
  else if (tab === 'review') view = <ReviewView />;
  else if (tab === 'progress') view = <ProgressView />;
  else if (tab === 'game' && route[1]) view = <GameReviewView gameId={route[1]} />;
  else view = null;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href={href('play')}>
          <span className="brand-mark" aria-hidden>♞</span>
          <span className="brand-name">Chess Coach</span>
        </a>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <a key={t.id} href={href(t.id)} className={`tab ${tab === t.id || (t.id === 'progress' && tab === 'game') ? 'is-active' : ''}`}>
              <span className="tab-icon" aria-hidden>{t.icon}</span>
              <span className="tab-label">{t.label}</span>
              {t.id === 'review' && due > 0 && <span className="badge" aria-label={`${due} due`}>{due}</span>}
            </a>
          ))}
        </nav>
      </header>
      <main className="page">
        {/* The game stays mounted so it survives tab switches. */}
        <div hidden={tab !== 'play'}><PlayView visible={tab === 'play'} /></div>
        {view}
      </main>
      {pattern && <PatternDrawer theme={pattern.theme} onClose={() => setPattern(null)} />}
    </div>
  );
}
