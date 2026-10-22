// Opening names (for live games) and the opponent's opening book, both indexed by
// position so transpositions are recognised.
import { Chess } from 'chess.js';
import { epd, moveToUci } from './chessutil.js';

const nameModules = import.meta.glob('../data/opening-names.js', { eager: true });
const bookModules = import.meta.glob('../data/book.js', { eager: true });
const NAME_LIST = Object.values(nameModules)[0]?.default ?? [];
const BOOK_LINES = Object.values(bookModules)[0]?.default?.lines ?? [];

const split = (moves) => (Array.isArray(moves) ? moves : moves.trim().split(/\s+/));

function walk(moves, visit) {
  const g = new Chess();
  for (const san of split(moves)) {
    const fen = g.fen();
    let r = null;
    try { r = g.move(san, { strict: false }); } catch { r = null; }
    if (!r) return null;
    visit?.(fen, r, g.fen());
  }
  return g.fen();
}

let nameIndex = null;
function names() {
  if (nameIndex) return nameIndex;
  nameIndex = new Map();
  for (const entry of NAME_LIST) {
    const fen = walk(entry.moves);
    if (!fen) continue;
    const key = epd(fen);
    const prev = nameIndex.get(key);
    if (!prev || split(entry.moves).length > split(prev.moves).length) nameIndex.set(key, entry);
  }
  return nameIndex;
}

/** Most specific named opening reached in a game, given its positions in order. */
export function openingOf(fens) {
  const idx = names();
  for (let i = fens.length - 1; i >= 0; i--) {
    const hit = idx.get(epd(fens[i]));
    if (hit) return { ...hit, ply: i };
  }
  return null;
}

let bookIndex = null;
function book() {
  if (bookIndex) return bookIndex;
  bookIndex = new Map();
  for (const line of BOOK_LINES) {
    const tags = new Set(line.tags || []);
    walk(line.moves, (fen, r) => {
      const key = epd(fen);
      if (!bookIndex.has(key)) bookIndex.set(key, new Map());
      const moves = bookIndex.get(key);
      const uci = moveToUci(r);
      const m = moves.get(uci) || { uci, san: r.san, lines: [] };
      m.lines.push({ id: line.id, name: line.name, tags, weight: line.weight ?? 5 });
      moves.set(uci, m);
    });
  }
  return bookIndex;
}

/** Book moves from this position: [{uci, san, lines:[{name, tags, weight}]}] */
export function bookMovesAt(fen) {
  const m = book().get(epd(fen));
  return m ? [...m.values()] : [];
}

export const hasBook = () => BOOK_LINES.length > 0;
