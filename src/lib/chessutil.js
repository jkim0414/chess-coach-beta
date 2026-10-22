import { Chess } from 'chess.js';

export const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const FILES = 'abcdefgh';
export const COLOR_NAME = { w: 'White', b: 'Black' };

export const opp = (c) => (c === 'w' ? 'b' : 'w');
export const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
export const turnOf = (fen) => fen.split(' ')[1];
export const sq = (f, r) => FILES[f] + r;
export const coords = (s) => [FILES.indexOf(s[0]), parseInt(s[1], 10)];
export const onBoard = (f, r) => f >= 0 && f < 8 && r >= 1 && r <= 8;

export function uciToObj(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci[4] ? { promotion: uci[4] } : {}) };
}
export const moveToUci = (m) => m.from + m.to + (m.promotion || '');

/** Try a move; returns the chess.js Move or null. Never throws. */
export function tryMove(game, move) {
  try {
    return game.move(typeof move === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) ? uciToObj(move) : move) || null;
  } catch {
    return null;
  }
}

export function uciToSan(fen, uci) {
  const r = tryMove(new Chess(fen), uci);
  return r ? r.san : uci;
}

export function sanToUci(fen, san) {
  const r = tryMove(new Chess(fen), san);
  return r ? moveToUci(r) : null;
}

/** Plays a UCI line from fen; returns [{san, uci, color, from, to, captured, fenBefore, fenAfter, check, mate}] until the first illegal move. */
export function playLine(fen, ucis, max = 99) {
  const g = new Chess(fen);
  const out = [];
  for (const u of ucis.slice(0, max)) {
    const fenBefore = g.fen();
    const r = tryMove(g, u);
    if (!r) break;
    out.push({
      san: r.san, uci: moveToUci(r), color: r.color, piece: r.piece, from: r.from, to: r.to,
      captured: r.captured || null, promotion: r.promotion || null, flags: r.flags,
      fenBefore, fenAfter: g.fen(), check: g.isCheck(), mate: g.isCheckmate(),
    });
  }
  return out;
}

/** "14.Nxe5 dxe5 15.Qh5+" — formats SAN moves starting from the given FEN. */
export function formatLine(fen, sans) {
  const parts = fen.split(' ');
  let color = parts[1];
  let num = parseInt(parts[5] || '1', 10);
  const out = [];
  sans.forEach((san, i) => {
    if (color === 'w') out.push(`${num}.${san}`);
    else out.push(i === 0 ? `${num}...${san}` : san);
    if (color === 'b') num++;
    color = opp(color);
  });
  return out.join(' ');
}

export function pvToSan(fen, pv, max = 12) {
  return playLine(fen, pv, max).map((s) => s.san);
}

/** Material from `color`'s point of view (own minus opponent's), in pawns. */
export function materialBalance(fenOrGame, color) {
  const g = typeof fenOrGame === 'string' ? new Chess(fenOrGame) : fenOrGame;
  let score = 0;
  for (const row of g.board()) for (const p of row) if (p) score += (p.color === color ? 1 : -1) * VALUES[p.type];
  return score;
}

/**
 * Same position with the other side to move (a "null move"): "what would they do if I passed?".
 * Null when the side to move is in check (passing would leave the king en prise).
 */
export function nullMoveFen(fen) {
  if (new Chess(fen).isCheck()) return null;
  const p = fen.split(' ');
  p[1] = opp(p[1]);
  p[3] = '-';
  return p.join(' ');
}

export function kingSquare(game, color) {
  const b = game.board();
  for (const row of b) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

export function gamePhase(game) {
  let nonPawn = 0;
  for (const row of game.board()) for (const p of row) if (p && p.type !== 'p' && p.type !== 'k') nonPawn += VALUES[p.type];
  const moveNo = game.moveNumber();
  if (moveNo <= 10 && nonPawn >= 50) return 'opening';
  if (nonPawn <= 26) return 'endgame';
  return 'middlegame';
}

export function pieceLabel(p, square) {
  return `${NAMES[p.type]} on ${square}`;
}

/** A sequence of played steps in standard notation from its first move: "13.c3 Qd3 14.cxb4 Bxb4". */
export function lineText(steps) {
  return steps.length ? formatLine(steps[0].fenBefore, steps.map((s) => s.san)) : '';
}
