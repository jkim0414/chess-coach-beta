// Real-game puzzles from the Lichess puzzle database (public API, CORS-enabled).
import { Chess } from 'chess.js';

export const THEMES = [
  { id: 'fork', name: 'Forks' },
  { id: 'pin', name: 'Pins' },
  { id: 'skewer', name: 'Skewers' },
  { id: 'discoveredAttack', name: 'Discovered attacks' },
  { id: 'hangingPiece', name: 'Loose pieces' },
  { id: 'mateIn1', name: 'Mate in 1' },
  { id: 'mateIn2', name: 'Mate in 2' },
  { id: 'mate', name: 'Checkmates' },
  { id: 'backRankMate', name: 'Back-rank mates' },
  { id: 'doubleCheck', name: 'Double checks' },
  { id: 'trappedPiece', name: 'Trapped pieces' },
  { id: 'deflection', name: 'Deflection' },
  { id: 'attraction', name: 'Attraction' },
  { id: 'promotion', name: 'Promotion' },
  { id: 'defensiveMove', name: 'Defensive moves' },
  { id: 'advantage', name: 'Winning material' },
  { id: 'endgame', name: 'Endgames' },
];
export const themeName = (id) => THEMES.find((t) => t.id === id)?.name || id;

export async function fetchPuzzle(theme, difficulty = 'normal', signal) {
  const url = `https://lichess.org/api/puzzle/next?angle=${encodeURIComponent(theme)}&difficulty=${encodeURIComponent(difficulty)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) throw new Error(res.status === 429 ? 'Lichess is rate-limiting requests — wait a minute and try again.' : `Lichess returned ${res.status}`);
  const data = await res.json();
  const g = new Chess();
  let last = null;
  for (const san of data.game.pgn.split(' ')) {
    const r = g.move(san);
    last = { from: r.from, to: r.to };
  }
  return {
    id: data.puzzle.id,
    fen: g.fen(),
    lastMove: last,
    solution: data.puzzle.solution,
    rating: data.puzzle.rating,
    themes: data.puzzle.themes,
    url: `https://lichess.org/training/${data.puzzle.id}`,
  };
}
