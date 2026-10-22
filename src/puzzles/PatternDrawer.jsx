import { useCallback, useEffect, useState } from 'react';
import { fetchPuzzle, themeName, THEMES } from './lichess.js';
import { recordPuzzle, upsertCard, reviewCard, useStore, setSettings } from '../lib/store.js';
import { Rating } from '../lib/fsrs.js';
import { turnOf } from '../lib/chessutil.js';
import PositionTrainer from '../review/PositionTrainer.jsx';

const SET_SIZE = 3;

/**
 * "Drill this pattern now": a short set of real-game puzzles on one theme, opened
 * from the moment you met (or missed) the pattern. Failed puzzles join your review deck.
 */
export default function PatternDrawer({ theme: initialTheme, onClose }) {
  const [theme, setTheme] = useState(initialTheme);
  const difficulty = useStore((s) => s.settings.puzzleDifficulty);
  const [n, setN] = useState(0);
  const [results, setResults] = useState([]);
  const [loaded, setLoaded] = useState({ key: null });
  const [finishedKey, setFinishedKey] = useState(null);

  // Everything below belongs to one request; a new request implicitly clears it.
  const key = `${theme}|${difficulty}|${n}`;
  const puzzle = loaded.key === key ? loaded.puzzle : null;
  const error = loaded.key === key ? loaded.error : null;
  const finished = finishedKey === key;
  const retry = () => setN((x) => x + 1);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPuzzle(theme, difficulty, ctrl.signal)
      .then((p) => setLoaded({ key, puzzle: p }))
      .catch((e) => { if (!ctrl.signal.aborted) setLoaded({ key, error: e.message || 'Could not reach Lichess.' }); });
    return () => ctrl.abort();
  }, [key, theme, difficulty]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onFinish = useCallback((r) => {
    const clean = r.solved && r.hintLevel === 0 && r.attempts === 1;
    recordPuzzle(theme, clean);
    setResults((x) => [...x, clean]);
    setFinishedKey(key);
    if (!clean && puzzle) {
      const id = `pz:${puzzle.id}`;
      upsertCard({
        id, type: 'puzzle', fen: puzzle.fen, answers: [puzzle.solution[0]], line: puzzle.solution, motif: theme,
        orientation: turnOf(puzzle.fen) === 'w' ? 'white' : 'black', lastMove: puzzle.lastMove,
        prompt: `Find the ${themeName(theme).toLowerCase().replace(/s$/, '')}.`,
        source: { puzzleId: puzzle.id, rating: puzzle.rating, theme },
      });
      reviewCard(id, Rating.Again);
    }
  }, [theme, puzzle, key]);

  const done = results.length >= SET_SIZE && finished;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" role="dialog" aria-label={`Practise ${themeName(theme)}`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="lesson-kicker">Pattern practice · {Math.min(results.length + (finished ? 0 : 1), SET_SIZE)}/{SET_SIZE}</div>
            <h2>{themeName(theme)}</h2>
          </div>
          <div className="drawer-tools">
            <select value={theme} onChange={(e) => { setResults([]); setTheme(e.target.value); }} aria-label="Theme">
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={difficulty} onChange={(e) => setSettings({ puzzleDifficulty: e.target.value })} aria-label="Difficulty">
              {['easiest', 'easier', 'normal', 'harder', 'hardest'].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </header>
        {error && <div className="notice">{error} <button type="button" className="link" onClick={retry}>Retry</button></div>}
        {!puzzle && !error && <div className="drawer-loading"><span className="thinking"><i /><i /><i /></span> Fetching a real-game puzzle…</div>}
        {puzzle && (
          <PositionTrainer
            runKey={puzzle.id}
            fen={puzzle.fen}
            orientation={turnOf(puzzle.fen) === 'w' ? 'white' : 'black'}
            solution={puzzle.solution}
            lastMove={puzzle.lastMove}
            prompt={`Find the ${themeName(theme).toLowerCase().replace(/s$/, '')}.`}
            context={<>Lichess puzzle · rating {puzzle.rating} · <a href={puzzle.url} target="_blank" rel="noreferrer">open on Lichess</a></>}
            onFinish={onFinish}
            footer={finished && (
              <div className="done-box">
                {done ? (
                  <>
                    <p><b>{results.filter(Boolean).length}/{results.length}</b> clean solves. {results.some((x) => !x) ? 'The ones you missed are in your review deck.' : 'Nice.'}</p>
                    <div className="callout-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Back</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResults([]); setN((x) => x + 1); }}>Another set</button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setN((x) => x + 1)}>Next puzzle</button>
                )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
