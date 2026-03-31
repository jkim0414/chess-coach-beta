import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useStockfish } from './useStockfish';
import './App.css';

const SKILL_LEVELS = [
  { label: 'Beginner (1)', value: 1 },
  { label: 'Easy (3)', value: 3 },
  { label: 'Casual (5)', value: 5 },
  { label: 'Intermediate (8)', value: 8 },
  { label: 'Advanced (12)', value: 12 },
  { label: 'Expert (17)', value: 17 },
  { label: 'Master (20)', value: 20 },
];

// ── Opening database ─────────────────────────────────────────────────────────
// Ordered most-specific first so the longest prefix match wins.
const OPENINGS = [
  // 8+ moves
  { moves:['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'], name:'Sicilian Najdorf', idea:'One of the sharpest openings. Black plans ...e5 or ...b5 queenside expansion while White attacks the kingside.' },
  { moves:['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6'], name:'Sicilian Dragon', idea:'Black fianchettoes the bishop on g7 for long-diagonal pressure. Expect opposite-side castling and mutual attacks.' },
  { moves:['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','Nf6','Nc3','d6'], name:'Sicilian Classical', idea:'Solid and popular. Black develops naturally and fights for the d5 square.' },
  { moves:['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O'], name:"King's Indian, Classical", idea:"White builds a massive center; Black will counter with ...e5 or ...c5, creating sharp imbalances." },
  { moves:['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3'], name:"Queen's Gambit Declined, Orthodox", idea:'A classical main line. White has a space advantage; Black has a solid, resilient structure.' },
  // 6 moves
  { moves:['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6'], name:'Giuoco Piano, Classical', idea:'White prepares d4 to claim the center. Black must react accurately or get squeezed.' },
  { moves:['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6'], name:'Ruy Lopez, Open Variation setup', idea:'Black will play ...b5 and ...Nxe4, entering sharp theory. Both sides must know the lines.' },
  { moves:['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6'], name:"King's Indian Defense", idea:"Black concedes the center and will counterattack it later with ...e5 or ...c5." },
  { moves:['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6'], name:"Slav Defense, Meran Variation", idea:'A rich theoretical battleground. Black defends d5 while keeping the light-squared bishop active.' },
  // 5 moves
  { moves:['e4','e5','Nf3','Nc6','Bc4','Bc5'], name:'Giuoco Piano', idea:"Both bishops aim at the center. White's bishop targets f7; Black mirrors with pressure on f2." },
  { moves:['e4','e5','Nf3','Nc6','Bc4','Nf6'], name:'Two Knights Defense', idea:"Black ignores the bishop and develops aggressively. The position can explode with 4.Ng5 or 4.d4." },
  { moves:['e4','e5','Nf3','Nc6','Bb5','a6'], name:'Ruy Lopez, Morphy Defense', idea:'Black questions the bishop at once. White must decide: take, retreat, or maintain the tension.' },
  { moves:['e4','e5','Nf3','Nc6','Bb5','Nf6'], name:'Ruy Lopez, Berlin Defense', idea:"Notoriously solid. After ...Nxe4 d6 Nxe4 dxe4, Black reaches a slightly passive but rock-solid game." },
  { moves:['e4','e5','Nf3','Nc6','d4','exd4'], name:'Scotch Game', idea:"White immediately opens the center. The Scotch leads to direct, principled play without long memorization." },
  { moves:['e4','e5','Nf3','Nc6','f4'], name:'King\'s Gambit, Knight Variation', idea:'White gambits with f4 after developing the knight — a very aggressive setup.' },
  { moves:['d4','d5','c4','e6','Nc3','Nf6'], name:"Queen's Gambit Declined", idea:"Solid and classical. Black reinforces d5 and plans ...Be7, ...O-O, then counterplay with ...c5 or ...dxc4." },
  { moves:['d4','d5','c4','dxc4','Nf3','Nf6'], name:"Queen's Gambit Accepted", idea:"Black takes the pawn and aims to fight back in the center with ...c5. White regains the pawn with easy development." },
  { moves:['d4','Nf6','c4','e6','Nf3','b6'], name:"Queen's Indian Defense", idea:"Black fianchettoes to control e4 indirectly. A hypermodern but very solid system." },
  { moves:['d4','Nf6','c4','g6','Nc3','Bg7'], name:"King's Indian Defense", idea:"The fianchetto is complete. The bishop on g7 is Black's long-term trump card." },
  { moves:['d4','Nf6','c4','c5','d5','e6'], name:"Modern Benoni", idea:"Sharp and double-edged. Black creates a queenside pawn majority; White has a central space advantage." },
  // 4 moves
  { moves:['e4','e5','Nf3','Nc6'], name:"King's Knight Opening", idea:"The most common response. Both sides fight for the center — hundreds of variations branch from here." },
  { moves:['e4','e5','Nf3','Nf6'], name:"Petrov's Defense", idea:"Black mirrors knight development rather than defending e5. Very solid and popular at the top level." },
  { moves:['e4','e5','Nf3','d6'], name:'Philidor Defense', idea:"Solid but passive — the pawn on d6 supports e5 but temporarily blocks the dark-squared bishop." },
  { moves:['e4','e5','Nc3','Nc6'], name:'Vienna Game', idea:"White prepares f4 for a King's Gambit-style attack, or d4 to open the center immediately." },
  { moves:['e4','e5','f4','exf4'], name:"King's Gambit Accepted", idea:"White sacrifices a pawn for rapid development and an open f-file. Black must defend carefully or return the material at the right moment." },
  { moves:['e4','e5','f4','Bc5'], name:"King's Gambit Declined, Classical", idea:"Black declines the gambit and develops actively with the bishop." },
  { moves:['e4','e5','Bc4','Nf6'], name:"Bishop's Opening, Berlin", idea:"Quick diagonal development. White targets f7 while Black counters in the center." },
  { moves:['e4','c5','Nf3','d6'], name:"Sicilian, Classical Setup", idea:"Preparing ...Nf6 and either ...g6 for the Dragon or ...e5 for the Boleslavsky." },
  { moves:['e4','c5','Nf3','Nc6'], name:"Sicilian, Classical Variation", idea:"Direct piece development. Black will contest the center after White plays d4." },
  { moves:['e4','c5','Nf3','e6'], name:"Sicilian, Kan/Taimanov setup", idea:"Flexible — Black avoids over-committing and keeps multiple structures available." },
  { moves:['e4','c5','c3','Nf6'], name:"Sicilian, Alapin Variation", idea:"White prepares d4 via c3, steering into a more positional game and sidestepping main-line theory." },
  { moves:['e4','c6','d4','d5'], name:"Caro-Kann, Main Lines", idea:"The central confrontation begins. White must choose between 3.Nc3, 3.Nd2, or the Exchange." },
  { moves:['e4','e6','d4','d5'], name:"French Defense, Main Line", idea:"The pawn chain is set. White attacks on the kingside; Black counters on the queenside with ...c5." },
  { moves:['e4','d5','exd5','Qxd5'], name:"Scandinavian, Classical Variation", idea:"Black retrieves the pawn with the queen — early but Black will have to move it again after Nc3." },
  { moves:['d4','d5','c4','e6'], name:"Queen's Gambit Declined", idea:"Black supports d5 with the e-pawn, forming a classical triangle pawn structure." },
  { moves:['d4','d5','c4','c6'], name:"Slav Defense", idea:"Black defends d5 without blocking the light-squared bishop — one of the most solid defenses." },
  { moves:['d4','d5','c4','dxc4'], name:"Queen's Gambit Accepted", idea:"Black accepts the gambit. White will regain the pawn and aim for a classical IQP center." },
  { moves:['d4','Nf6','c4','g6'], name:"King's Indian Defense", idea:"Hypermodern: Black lets White occupy the center, then counterattacks it." },
  { moves:['d4','Nf6','c4','e6'], name:"Indian Game, e6 Variation", idea:"Can transpose to the Nimzo-Indian, Queen's Indian, or Ragozin — Black keeps options open." },
  { moves:['d4','Nf6','c4','c5'], name:"Benoni Defense", idea:"Dynamic and double-edged. White gets central space; Black gets queenside counterplay and the bishop pair." },
  { moves:['d4','Nf6','Nf3','g6'], name:"Neo-Grünfeld setup", idea:"Flexible and hypermodern — targeting d5 while delaying the pawn structure." },
  { moves:['c4','e5','Nc3','Nf6'], name:"English, Reversed Sicilian", idea:"White plays a Sicilian-style structure with an extra tempo — a sophisticated positional choice." },
  // 3 moves
  { moves:['e4','e5','Nf3'], name:"King's Knight Opening", idea:"Attacks e5 and prepares Bc4 or Bb5. The most flexible and popular reply to 1...e5." },
  { moves:['e4','e5','f4'], name:"King's Gambit", idea:"An aggressive pawn sacrifice for rapid development and a direct kingside attack. Still dangerous at club level." },
  { moves:['e4','e5','d4'], name:"Center Game", idea:"White immediately opens the center but the queen comes out early to d4, where it can be harassed." },
  { moves:['e4','e5','Bc4'], name:"Bishop's Opening", idea:"Quick diagonal development, already eyeing the f7 weakness." },
  { moves:['e4','e5','Nc3'], name:"Vienna Game", idea:"Solid development, preparing f4 or d4 for a central break." },
  { moves:['e4','c5','Nf3'], name:"Sicilian, Open Variation", idea:"White prepares d4 to open the center and challenge Black's Sicilian." },
  { moves:['e4','c5','Nc3'], name:"Sicilian, Closed Variation", idea:"White builds quietly — a more positional alternative to the Open Sicilian." },
  { moves:['e4','c5','c3'], name:"Sicilian, Alapin", idea:"c3 prepares d4 while keeping the game more controlled. Less theory, but still ambitious." },
  { moves:['e4','c6','d4'], name:"Caro-Kann Defense", idea:"White builds a classical pawn center. The real fight begins when Black plays ...d5." },
  { moves:['e4','e6','d4'], name:"French Defense", idea:"White establishes a d4-e4 pawn center. The coming pawn tension on d5 will define the game." },
  { moves:['e4','d5','exd5'], name:"Scandinavian Defense", idea:"White captures, gaining space — Black will recapture and aim for quick piece activity." },
  { moves:['e4','Nf6','e5'], name:"Alekhine's Defense, Main Line", idea:"White gains space by chasing the knight, but overextended pawns can become targets later." },
  { moves:['d4','d5','c4'], name:"Queen's Gambit", idea:"White offers a flank pawn to gain central control after cxd5 and e4. One of the oldest and most respected openings." },
  { moves:['d4','d5','Nf3'], name:"Queen's Pawn Game", idea:"Quiet and flexible. White develops the knight and keeps the pawn structure fluid." },
  { moves:['d4','Nf6','c4'], name:"Indian Game", idea:"White sets up the English/Queen's Gambit pawn duo. Black will decide between the KID, Nimzo, Queen's Indian, or Grünfeld." },
  { moves:['d4','Nf6','Nf3'], name:"Indian Game, 2.Nf3", idea:"Flexible — avoids early Nc3 and keeps Nimzo-Indian lines off the board." },
  { moves:['c4','e5','Nc3'], name:"English Opening, Reversed Sicilian", idea:"White mirrors the Sicilian with an extra tempo — expect a positional battle over the d5 square." },
  { moves:['c4','c5','Nf3'], name:"English Opening, Symmetrical", idea:"Both sides mirror each other. The game will revolve around who can break the symmetry favorably." },
  { moves:['Nf3','d5','c4'], name:"Réti Opening", idea:"White flank-attacks d5 instead of occupying the center. Plans to fianchetto and apply long-term pressure." },
  { moves:['Nf3','Nf6','c4'], name:"English/Réti Hybrid", idea:"Flexible hypermodern setup — Black mirrors development while White avoids committing centrally." },
  // 2 moves
  { moves:['e4','e5'], name:"Open Game", idea:"Symmetrical pawn center leads to open, tactical play. Nearly all classical openings start here." },
  { moves:['e4','c5'], name:"Sicilian Defense", idea:"The most popular reply to 1.e4. Black fights asymmetrically for the center and queenside counterplay." },
  { moves:['e4','e6'], name:"French Defense", idea:"Black prepares ...d5 — accepting a slightly cramped but resilient structure with clear counterplay." },
  { moves:['e4','c6'], name:"Caro-Kann Defense", idea:"Solid preparation for ...d5. Less cramped than the French, with the light-squared bishop kept free." },
  { moves:['e4','d5'], name:"Scandinavian Defense", idea:"Black immediately challenges e4, accepting an early queen sortie in exchange for active play." },
  { moves:['e4','Nf6'], name:"Alekhine's Defense", idea:"Black invites White to overextend the center with e5, then chips away at it." },
  { moves:['e4','g6'], name:"Modern Defense", idea:"Hypermodern — Black fianchettoes and challenges White's center from a distance." },
  { moves:['e4','d6'], name:"Pirc Defense", idea:"Flexible hypermodern setup, often transposing to the Pirc or Modern after ...Nf6 and ...g6." },
  { moves:['d4','d5'], name:"Closed Game", idea:"Classical central confrontation. The ensuing structures and plans depend on the next few moves." },
  { moves:['d4','Nf6'], name:"Indian Defense", idea:"Black responds hypermodernly, preparing to contest the center from the flank." },
  { moves:['d4','f5'], name:"Dutch Defense", idea:"Black fights for e4 at the cost of slightly weakening the kingside." },
  { moves:['d4','e5'], name:"Englund Gambit", idea:"An ambitious but risky counter-gambit — Black sacrifices a pawn for rapid piece activity." },
  { moves:['c4','e5'], name:"English Opening", idea:"Reversed Sicilian setup. Positional and flexible — White controls d5 from the flank." },
  { moves:['c4','c5'], name:"English Opening, Symmetrical", idea:"Both sides mirror each other, leading to strategic maneuvering over the d5 and e4 squares." },
  { moves:['Nf3','d5'], name:"Réti Opening", idea:"Hypermodern — White develops the knight before committing to a pawn structure." },
  // 1 move
  { moves:['e4'], name:"King's Pawn Opening", idea:"Controls d5 and f5, opens lines for the queen and f1 bishop. The most popular first move in chess history." },
  { moves:['d4'], name:"Queen's Pawn Opening", idea:"Controls e5 and c5, leads to solid central battles. Favored by positional players." },
  { moves:['c4'], name:"English Opening", idea:"Controls d5 from the flank. Extremely flexible — can transpose to many structures." },
  { moves:['Nf3'], name:"Réti Opening", idea:"Develops the knight to its best square before committing pawns — a hypermodern approach." },
  { moves:['g3'], name:"King's Fianchetto Opening", idea:"Plans Bg2 for long-diagonal pressure. Quiet and flexible." },
  { moves:['b3'], name:"Larsen's Opening", idea:"Plans Bb2 for queenside diagonal pressure. Provocative and original." },
  { moves:['f4'], name:"Bird's Opening", idea:"Fights for e5 and e4 from the flank. Aggressive but exposes the king slightly." },
];

const PIECE_NAMES = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };

const PIECE_SYMBOLS = {
  w: { p:'♙', n:'♘', b:'♗', r:'♖', q:'♕' },
  b: { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛' },
};
const PIECE_ORDER = ['q','r','b','n','p'];
const PIECE_VALUES = { p:1, n:3, b:3, r:5, q:9 };

function getCapturedPieces(game) {
  const initial = { p:8, n:2, b:2, r:2, q:1 };
  const counts = { w:{p:0,n:0,b:0,r:0,q:0}, b:{p:0,n:0,b:0,r:0,q:0} };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type !== 'k') counts[sq.color][sq.type]++;
    }
  }
  const capturedByWhite = {}, capturedByBlack = {};
  for (const t of ['p','n','b','r','q']) {
    capturedByWhite[t] = Math.max(0, initial[t] - counts.b[t]);
    capturedByBlack[t] = Math.max(0, initial[t] - counts.w[t]);
  }
  const wScore = PIECE_ORDER.reduce((s,t) => s + (capturedByWhite[t]||0)*PIECE_VALUES[t], 0);
  const bScore = PIECE_ORDER.reduce((s,t) => s + (capturedByBlack[t]||0)*PIECE_VALUES[t], 0);
  return { capturedByWhite, capturedByBlack, diff: wScore - bScore };
}

function PlayerStrip({ isTop, colorChar, name, captured, pieceColor, advantage }) {
  const pieces = [];
  for (const t of PIECE_ORDER) {
    for (let i = 0; i < (captured[t] || 0); i++) pieces.push(PIECE_SYMBOLS[pieceColor][t]);
  }
  return (
    <div className={`player-strip ${isTop ? 'player-strip--top' : 'player-strip--bottom'}`}>
      <span className="player-icon">{colorChar === 'w' ? '♔' : '♚'}</span>
      <span className="player-name">{name}</span>
      <span className="player-material">
        {pieces.length > 0 && <span className="player-pieces">{pieces.join('')}</span>}
        {advantage > 0 && <span className="player-adv">+{advantage}</span>}
      </span>
    </div>
  );
}

function detectOpening(chess, sanHistory) {
  const history = sanHistory && sanHistory.length ? sanHistory : chess.history();
  if (!history.length) return null;
  let best = null;
  for (const o of OPENINGS) {
    if (o.moves.length > history.length) continue;
    if (o.moves.every((m, i) => history[i] === m)) {
      if (!best || o.moves.length > best.moves.length) best = o;
    }
  }
  return best;
}

// Returns array of {square, piece} being forked by the piece on `square`
function getForkedPieces(afterGame, square, color) {
  const moves = afterGame.moves({ square, verbose: true });
  const seen = new Set();
  const targets = [];
  for (const m of moves) {
    if (m.captured && !seen.has(m.to)) {
      seen.add(m.to);
      const p = afterGame.get(m.to);
      if (p) targets.push({ square: m.to, piece: p });
    }
  }
  // Filter: only count pieces whose value >= a pawn (exclude trivial pawn forks unless high-value)
  const val = { p:1, n:3, b:3, r:5, q:9, k:99 };
  const movingVal = val[afterGame.get(square)?.type || 'p'];
  return targets.filter(t => val[t.piece.type] >= movingVal || t.piece.type === 'k');
}

// Detect if the piece on `square` is pinning an opponent piece against their king
function detectPin(afterGame, square) {
  const attacker = afterGame.get(square);
  if (!attacker || !['b','r','q'].includes(attacker.type)) return null;

  const FILES = 'abcdefgh';
  const oppColor = attacker.color === 'w' ? 'b' : 'w';

  // Find opponent king
  let kingSquare = null;
  const board = afterGame.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === oppColor) {
        kingSquare = FILES[c] + (8 - r);
      }
    }
  }
  if (!kingSquare) return null;

  const fc = FILES.indexOf(square[0]), fr = parseInt(square[1]);
  const kc = FILES.indexOf(kingSquare[0]), kr = parseInt(kingSquare[1]);
  const dc = Math.sign(kc - fc), dr = Math.sign(kr - fr);

  // Must align on rank, file, or diagonal
  if (dc === 0 && dr === 0) return null;
  if (dc !== 0 && dr !== 0 && Math.abs(kc - fc) !== Math.abs(kr - fr)) return null;
  if (attacker.type === 'r' && dc !== 0 && dr !== 0) return null;
  if (attacker.type === 'b' && (dc === 0 || dr === 0)) return null;

  // Walk toward king, look for exactly one opponent piece
  let pinnedSquare = null, pinnedPiece = null;
  let c = fc + dc, r = fr + dr;
  while (c !== kc || r !== kr) {
    const sq = FILES[c] + r;
    const p = afterGame.get(sq);
    if (p) {
      if (p.color === oppColor) {
        if (pinnedSquare) return null; // two pieces blocking
        pinnedSquare = sq; pinnedPiece = p;
      } else {
        return null; // own piece blocks
      }
    }
    c += dc; r += dr;
  }
  return pinnedSquare ? { square: pinnedSquare, piece: pinnedPiece } : null;
}

// Detect if moving from->to revealed an attack by a piece that was behind `from`
function detectDiscoveredAttack(beforeGame, afterGame, from, to, color) {
  const FILES = 'abcdefgh';
  const oppColor = color === 'w' ? 'b' : 'w';
  const fc = FILES.indexOf(from[0]), fr = parseInt(from[1]);

  // Directions to look behind from the moving piece's origin
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [dc, dr] of dirs) {
    // Look in the opposite direction from where we moved (behind the origin)
    let c = fc - dc, r = fr - dr;
    while (c >= 0 && c <= 7 && r >= 1 && r <= 8) {
      const sq = FILES[c] + r;
      const p = beforeGame.get(sq);
      if (p) {
        if (p.color === color && ['r','b','q'].includes(p.type)) {
          // This slider was behind `from`. Check if it now attacks something valuable.
          const nowAttacks = afterGame.moves({ square: sq, verbose: true })
            .filter(m => m.captured && m.to !== to); // not counting the main move's target
          if (nowAttacks.length > 0) {
            const best = nowAttacks.reduce((a, b) => {
              const val = { p:1, n:3, b:3, r:5, q:9, k:99 };
              return val[b.captured] > val[a.captured] ? b : a;
            });
            const discovererName = PIECE_NAMES[p.type];
            const targetName = PIECE_NAMES[best.captured];
            return `Discovered attack — moving this piece unmasks the ${discovererName} on ${sq}, which now threatens the ${targetName} on ${best.to}`;
          }
        }
        break; // any piece blocks the line
      }
      c -= dc; r -= dr;
    }
  }
  return null;
}

// What threats does the piece on `square` create after moving there?
function getThreats(afterGame, square, color) {
  const piece = afterGame.get(square);
  if (!piece) return [];
  const moves = afterGame.moves({ square, verbose: true });
  const captures = moves.filter(m => m.captured);
  if (!captures.length) return [];
  // Sort by piece value
  const val = { p:1, n:3, b:3, r:5, q:9, k:99 };
  captures.sort((a, b) => val[b.captured] - val[a.captured]);
  const top = captures[0];
  return [`to capture the ${PIECE_NAMES[top.captured]} on ${top.to}`];
}

// Describe a pawn move specifically
function describePawnMove(chess, afterGame, result) {
  const to = result.to;
  const file = to[0], rank = parseInt(to[1]);
  const centralFiles = ['d','e'];
  const color = result.color;

  // Is it a passed pawn?
  const oppColor = color === 'w' ? 'b' : 'w';
  const direction = color === 'w' ? 1 : -1;
  const FILES = 'abcdefgh';
  const fileIdx = FILES.indexOf(file);
  let blocked = false;
  for (let r = rank + direction; r >= 1 && r <= 8; r += direction) {
    for (const df of [-1, 0, 1]) {
      const ci = fileIdx + df;
      if (ci < 0 || ci > 7) continue;
      const sq = FILES[ci] + r;
      const p = afterGame.get(sq);
      if (p && p.type === 'p' && p.color === oppColor) { blocked = true; break; }
    }
    if (blocked) break;
  }
  if (!blocked && (color === 'w' ? rank >= 5 : rank <= 4)) {
    return `Creates a passed pawn on ${to} — no enemy pawn can stop it from queening`;
  }

  if (centralFiles.includes(file) && (rank === 4 || rank === 5)) {
    return `Advances to ${to}, claiming central space and restricting the opponent's options`;
  }

  // Pawn breaks
  const attacks = afterGame.moves({ square: to, verbose: true }).filter(m => m.captured);
  if (attacks.length > 0) {
    const targets = attacks.map(m => PIECE_NAMES[m.captured]);
    return `Advances to ${to}, threatening to take the ${targets[0]}`;
  }

  return null;
}

// Describe a knight move specifically
function describeKnightMove(chess, afterGame, result) {
  const to = result.to;
  const central = ['d4','d5','e4','e5','c3','c6','f3','f6'];
  const goodSquares = ['d4','d5','e4','e5','f5','c5','f4','c4'];

  // Is it an outpost? (no opposing pawn can chase it)
  const color = result.color;
  const oppColor = color === 'w' ? 'b' : 'w';
  const FILES = 'abcdefgh';
  const fc = FILES.indexOf(to[0]), fr = parseInt(to[1]);
  const direction = oppColor === 'w' ? 1 : -1; // direction opponent pawns attack from
  const pawnAttackSquares = [
    FILES[fc-1] && (FILES[fc-1] + (fr + direction)),
    FILES[fc+1] && (FILES[fc+1] + (fr + direction)),
  ].filter(Boolean);
  const isOutpost = pawnAttackSquares.every(sq => {
    const p = afterGame.get(sq);
    return !p || p.type !== 'p' || p.color !== oppColor;
  });

  const attacks = afterGame.moves({ square: to, verbose: true });
  const centralAttacked = attacks.map(m => m.to).filter(sq => central.includes(sq));

  let desc = `Moves the knight to ${to}`;
  if (goodSquares.includes(to) && isOutpost) {
    desc = `Establishes the knight on the outpost at ${to} — no enemy pawn can drive it away`;
  } else if (goodSquares.includes(to)) {
    desc = `Develops the knight to the active square ${to}`;
  }
  if (centralAttacked.length >= 2) {
    desc += `, controlling the key squares ${centralAttacked.slice(0,2).join(' and ')}`;
  } else if (centralAttacked.length === 1) {
    desc += `, eyeing ${centralAttacked[0]}`;
  }

  // Does it immediately threaten something?
  const captures = attacks.filter(m => m.captured);
  const val = { p:1, n:3, b:3, r:5, q:9, k:99 };
  if (captures.length > 0) {
    captures.sort((a,b) => val[b.captured] - val[a.captured]);
    desc += `, threatening to win the ${PIECE_NAMES[captures[0].captured]} on ${captures[0].to}`;
  }
  return desc;
}

// Describe a bishop move specifically
function describeBishopMove(chess, afterGame, result) {
  const to = result.to;
  const color = result.color;
  const attacks = afterGame.moves({ square: to, verbose: true });
  const captures = attacks.filter(m => m.captured);
  const val = { p:1, n:3, b:3, r:5, q:9, k:99 };

  // Fianchetto?
  if ((color === 'w' && (to === 'g2' || to === 'b2')) ||
      (color === 'b' && (to === 'g7' || to === 'b7'))) {
    const diagonal = (to === 'g2' || to === 'b7') ? 'long diagonal' : "queen's diagonal";
    return `Fianchettoes the bishop to ${to}, commanding the ${diagonal} and bolstering central control`;
  }

  // Classic attacking diagonal (Italian/Bishop's Opening)
  if ((color === 'w' && (to === 'c4' || to === 'b5')) ||
      (color === 'b' && (to === 'c5' || to === 'b4'))) {
    const f7Threat = attacks.find(m => m.to === 'f7' || m.to === 'f2');
    if (f7Threat) {
      return `Develops the bishop to ${to}, targeting the vulnerable ${f7Threat.to} pawn and aiming at the heart of the opponent's position`;
    }
    return `Develops the bishop to the active square ${to}, applying diagonal pressure toward the center`;
  }

  if (captures.length > 0) {
    captures.sort((a,b) => val[b.captured] - val[a.captured]);
    return `Places the bishop on ${to}, immediately threatening to win the ${PIECE_NAMES[captures[0].captured]} on ${captures[0].to}`;
  }

  return `Develops the bishop to ${to}, opening the diagonal for long-range pressure`;
}

// Describe a rook move specifically
function describeRookMove(chess, afterGame, result) {
  const to = result.to;
  const file = to[0];

  // Check if file is open (no pawns)
  const FILES = 'abcdefgh';
  let hasWhitePawn = false, hasBlackPawn = false;
  for (let r = 1; r <= 8; r++) {
    const p = afterGame.get(file + r);
    if (p && p.type === 'p') {
      if (p.color === 'w') hasWhitePawn = true;
      else hasBlackPawn = true;
    }
  }
  if (!hasWhitePawn && !hasBlackPawn) {
    return `Activates the rook on the open ${file}-file, creating immediate pressure along the entire file`;
  }
  if (!hasWhitePawn || !hasBlackPawn) {
    const side = !hasWhitePawn ? 'semi-open' : 'semi-open';
    return `Places the rook on the ${side} ${file}-file, eyeing the opponent's pawn`;
  }

  // 7th rank
  const rank = parseInt(to[1]);
  if ((result.color === 'w' && rank === 7) || (result.color === 'b' && rank === 2)) {
    return `Invades the 7th rank with the rook — a dominant position that attacks all enemy pawns on that rank`;
  }

  return `Activates the rook to ${to}`;
}

// Material balance from one side's perspective
function getMaterialBalance(game, color) {
  const vals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let score = 0;
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type !== 'k') {
        score += sq.color === color ? vals[sq.type] : -vals[sq.type];
      }
    }
  }
  return score;
}

// Build a natural-language "idea line" from the Stockfish PV
// Format: "If [their response], [our continuation] — [outcome]"
function buildIdeaLine(chess, pvLine) {
  if (!pvLine || pvLine.length < 3) return null;

  const tempGame = new Chess(chess.fen());
  const sanMoves = [];

  for (const uci of pvLine.slice(0, 7)) {
    try {
      const r = tempGame.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci[4] ? { promotion: uci[4] } : {}),
      });
      if (!r) break;
      sanMoves.push(r.san);
    } catch { break; }
  }

  // Need: [our move, their response, our reply]
  if (sanMoves.length < 3) return null;

  const playerColor = chess.turn();
  const matBefore = getMaterialBalance(chess, playerColor);
  const matAfter  = getMaterialBalance(tempGame, playerColor);
  const gain = matAfter - matBefore;

  let outcome = null;
  if (tempGame.isCheckmate()) {
    outcome = 'checkmate';
  } else if (tempGame.isCheck()) {
    if (gain >= 3) outcome = 'winning a piece with check';
    else if (gain >= 1) outcome = 'winning a pawn with check';
  } else if (gain >= 9) {
    outcome = 'winning the queen';
  } else if (gain >= 5) {
    outcome = 'winning the exchange';
  } else if (gain >= 3) {
    outcome = 'winning a piece';
  } else if (gain >= 1) {
    outcome = 'winning a pawn';
  } else if (gain <= -4) {
    outcome = 'sacrificing material for the initiative';
  }

  const theirResponse = sanMoves[1];
  const continuation  = sanMoves.slice(2).join(' ');

  if (outcome) {
    return `If ${theirResponse}, ${continuation} — ${outcome}`;
  }
  // Only show longer lines without a clear outcome (avoids noise for quiet moves)
  if (sanMoves.length >= 5) {
    return `If ${theirResponse}, ${continuation}`;
  }
  return null;
}

function cpToAdvantage(cp) {
  const pawns = cp / 100;
  if (Math.abs(pawns) < 0.3) return 'roughly equal';
  const side = pawns > 0 ? 'White' : 'Black';
  const abs = Math.abs(pawns).toFixed(1);
  return `${side} +${abs}`;
}

function scoreLabel(scoreStr, turn) {
  if (!scoreStr) return '';
  if (scoreStr.startsWith('mate')) {
    const n = parseInt(scoreStr.split(' ')[1]);
    if (n === 0) return 'Checkmate';
    const mateIn = Math.abs(n);
    const winning = turn === 'w' ? n > 0 : n < 0;
    return winning ? `Mate in ${mateIn}` : `Opponent mates in ${mateIn}`;
  }
  const cp = parseInt(scoreStr.split(' ')[1]);
  const adjustedCp = turn === 'w' ? cp : -cp;
  return cpToAdvantage(adjustedCp);
}

function getMoveExplanation(chess, moveObj, score, pvLine, multiPvIndex, sanHistory) {
  const clone = new Chess(chess.fen());
  let result;
  try { result = clone.move(moveObj); } catch { return 'Strong continuation.'; }
  if (!result) return 'Strong continuation.';

  const parts = [];
  const moveNum = chess.moveNumber();
  const color = result.color;

  // ── Checkmate ────────────────────────────────────────────────────────────
  if (result.san.includes('#')) return 'Delivers checkmate!';

  // ── Opening identification (best-move only) ───────────────────────────────
  if (multiPvIndex === 0 && moveNum <= 20) {
    const opening = detectOpening(chess, sanHistory);
    if (opening && opening.moves.length === sanHistory.length) {
      parts.push(`${opening.name}: ${opening.idea}`);
    }
  }

  // ── Castling ─────────────────────────────────────────────────────────────
  if (result.san === 'O-O') {
    parts.push('Castles kingside — the king finds safety behind the g and h pawns while the rook activates on f1');
  } else if (result.san === 'O-O-O') {
    parts.push('Castles queenside — the rook lands on d1 aiming at the center, and the king tucks behind the c-pawn');
  }

  // ── Promotion ────────────────────────────────────────────────────────────
  if (result.flags.includes('p')) {
    parts.push(`Promotes the pawn to a queen on ${result.to}, creating an overwhelming material advantage`);
  }

  // ── Captures ─────────────────────────────────────────────────────────────
  if (result.flags.includes('c') || result.flags.includes('e')) {
    const name = PIECE_NAMES[result.captured];
    parts.push(result.captured === 'p'
      ? `Takes the pawn on ${result.to}, gaining a small but concrete material edge`
      : `Wins the ${name} on ${result.to}`);
  }

  // ── Check ────────────────────────────────────────────────────────────────
  if (result.san.includes('+') && !result.san.includes('#')) {
    parts.push(`Gives check on ${result.to}, forcing the opponent to respond and potentially losing a tempo`);
  }

  // ── Tactical motifs ──────────────────────────────────────────────────────
  // Fork
  const forked = getForkedPieces(clone, result.to, color);
  if (forked.length >= 2) {
    const names = forked.slice(0,2).map(f => `${PIECE_NAMES[f.piece.type]} on ${f.square}`);
    parts.push(`Creates a fork: the ${PIECE_NAMES[result.piece]} on ${result.to} attacks the ${names.join(' and ')} simultaneously — one must be lost`);
  }

  // Pin (only if no fork already detected)
  if (forked.length < 2) {
    const pin = detectPin(clone, result.to);
    if (pin) {
      parts.push(`Pins the ${PIECE_NAMES[pin.piece.type]} on ${pin.square} to the king — it cannot legally move without exposing the king to check`);
    }
  }

  // Discovered attack
  if (forked.length < 2) {
    const disc = detectDiscoveredAttack(chess, clone, result.from, result.to, color);
    if (disc) parts.push(disc);
  }

  // ── Move-specific descriptions ────────────────────────────────────────────
  if (!result.flags.includes('c') && !result.flags.includes('e') &&
      result.san !== 'O-O' && result.san !== 'O-O-O' && !result.flags.includes('p')) {
    let desc = null;
    if (result.piece === 'p') desc = describePawnMove(chess, clone, result);
    else if (result.piece === 'n') desc = describeKnightMove(chess, clone, result);
    else if (result.piece === 'b') desc = describeBishopMove(chess, clone, result);
    else if (result.piece === 'r') desc = describeRookMove(chess, clone, result);
    if (desc) parts.push(desc);
  }

  // ── Threats (if no tactic and no capture) ───────────────────────────────
  if (forked.length < 2 && !result.flags.includes('c') && !result.flags.includes('e')) {
    const threats = getThreats(clone, result.to, color);
    if (threats.length > 0 && !parts.some(p => p.includes('threatening') || p.includes('Threatens'))) {
      parts.push(`Threatens ${threats[0]}`);
    }
  }

  // ── Idea line from PV ────────────────────────────────────────────────────
  if (pvLine) {
    const idea = buildIdeaLine(chess, pvLine);
    if (idea) parts.push(idea);
  }

  // ── Score context ─────────────────────────────────────────────────────────
  if (score) {
    if (score.startsWith('mate')) {
      const n = parseInt(score.split(' ')[1]);
      const abs = Math.abs(n);
      const winning = color === 'w' ? n > 0 : n < 0;
      if (winning && abs <= 5) parts.push(`Leads to forced checkmate in ${abs} moves`);
      else if (!winning && abs <= 3) parts.push(`Caution: opponent can force checkmate in ${abs} after this`);
    } else {
      const cp = parseInt(score.split(' ')[1]);
      const adj = color === 'w' ? cp : -cp;
      if (adj > 500) parts.push('Clinches a decisive, winning position');
      else if (adj > 200) parts.push('Establishes a large, likely winning advantage');
      else if (adj > 80) parts.push('Gains a clear positional edge that should convert to a win with accurate play');
      else if (adj > 20) parts.push('Maintains a small but stable initiative');
      else if (adj < -200) parts.push('Risky — this allows the opponent a large advantage');
      else if (adj < -80) parts.push('Dubious — the opponent gets a meaningful edge after this');
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (parts.length === 0) {
    if (multiPvIndex === 0) parts.push('Best move in the position — maintains the optimal balance of activity and safety');
    else if (multiPvIndex === 1) parts.push('Solid alternative — similar ideas but slightly less precise');
    else parts.push('Reasonable option, though the engine prefers the moves above');
  }

  return parts.join('. ') + '.';
}

function parseInfoLine(line) {
  const parts = line.split(' ');
  let multipv = 1, depth = 0, score = null, pv = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'multipv') multipv = parseInt(parts[i + 1]);
    if (parts[i] === 'depth') depth = parseInt(parts[i + 1]);
    if (parts[i] === 'score') {
      score = parts[i + 1] + ' ' + parts[i + 2];
      i += 2;
    }
    if (parts[i] === 'pv') {
      pv = parts.slice(i + 1);
      break;
    }
  }
  return { multipv, depth, score, pv };
}

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [playerColor, setPlayerColor] = useState('white');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [skillLevel, setSkillLevel] = useState(8);
  const [status, setStatus] = useState('White to move');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [coachingMoves, setCoachingMoves] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState('');
  const [promotionDialog, setPromotionDialog] = useState(null);
  // undo/redo: snapshots of board state at each player-to-move moment
  const [snapshots, setSnapshots] = useState([{ fen: new Chess().fen(), lastMove: null, sanHistory: [] }]);
  const [snapIdx, setSnapIdx] = useState(0);
  const [showCoach, setShowCoach] = useState(true);

  const { send, addListener } = useStockfish();
  const moveHistoryRef = useRef(null);
  const pvDataRef = useRef({});
  const analysisDepthRef = useRef(0);
  const analysisActiveRef = useRef(false);
  const gameRef = useRef(game);
  const playerColorRef = useRef(playerColor);
  const skillLevelRef = useRef(skillLevel);
  const snapIdxRef = useRef(0);
  const snapshotsRef = useRef(snapshots);
  const sanHistoryRef = useRef([]); // full SAN move list for current game
  gameRef.current = game;
  playerColorRef.current = playerColor;
  skillLevelRef.current = skillLevel;
  snapIdxRef.current = snapIdx;
  snapshotsRef.current = snapshots;

  const updateStatus = useCallback((g) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'Black' : 'White';
      setStatus(`Checkmate! ${winner} wins.`);
      setGameOver(true);
    } else if (g.isDraw()) {
      let reason = 'Draw';
      if (g.isStalemate()) reason = 'Stalemate — Draw';
      else if (g.isThreefoldRepetition()) reason = 'Threefold Repetition — Draw';
      else if (g.isInsufficientMaterial()) reason = 'Insufficient Material — Draw';
      setStatus(reason);
      setGameOver(true);
    } else {
      const check = g.isCheck() ? ' (Check!)' : '';
      setStatus(`${g.turn() === 'w' ? 'White' : 'Black'} to move${check}`);
      setGameOver(false);
    }
  }, []);

  useEffect(() => {
    if (moveHistoryRef.current) {
      moveHistoryRef.current.scrollTop = moveHistoryRef.current.scrollHeight;
    }
  });

  const requestAiMove = useCallback((g, level) => {
    analysisActiveRef.current = false;
    const depth = Math.max(2, Math.floor(level * 1.2));
    send('setoption name Skill Level value ' + level);
    send('setoption name MultiPV value 1');
    send('position fen ' + g.fen());
    send('go depth ' + depth);
  }, [send]);

  const requestCoachingAnalysis = useCallback((g) => {
    pvDataRef.current = {};
    analysisDepthRef.current = 0;
    analysisActiveRef.current = true;
    setAnalyzing(true);
    setCoachingMoves([]);
    send('setoption name Skill Level value 20');
    send('setoption name MultiPV value 3');
    send('position fen ' + g.fen());
    send('go depth 18');
  }, [send]);

  useEffect(() => {
    const removeListener = addListener((msg) => {
      if (typeof msg !== 'string') return;

      if (msg.startsWith('info') && analysisActiveRef.current && msg.includes(' pv ')) {
        if (!msg.includes('multipv')) return;
        const parsed = parseInfoLine(msg);
        if (parsed.pv.length === 0) return;
        if (parsed.depth >= analysisDepthRef.current) {
          analysisDepthRef.current = parsed.depth;
          pvDataRef.current[parsed.multipv] = {
            score: parsed.score,
            pv: parsed.pv,
            depth: parsed.depth,
          };
        }
      } else if (msg.startsWith('bestmove')) {
        if (analysisActiveRef.current) {
          // Coaching analysis finished
          analysisActiveRef.current = false;
          setAnalyzing(false);
          const g = gameRef.current;

          const entries = Object.entries(pvDataRef.current)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .slice(0, 3);

          const moves = entries.map(([, data], i) => {
            const uciMove = data.pv[0];
            if (!uciMove || uciMove.length < 4) return null;
            const moveObj = {
              from: uciMove.slice(0, 2),
              to: uciMove.slice(2, 4),
              promotion: uciMove[4] || undefined,
            };
            const tempGame = new Chess(g.fen());
            let san = uciMove;
            try {
              const r = tempGame.move(moveObj);
              if (r) san = r.san;
            } catch {}
            const explanation = getMoveExplanation(g, moveObj, data.score, data.pv, i, sanHistoryRef.current);
            const scoreText = scoreLabel(data.score, g.turn());
            return { uci: uciMove, san, score: data.score, scoreText, explanation };
          }).filter(Boolean);

          setCoachingMoves(moves);
        } else {
          // AI move
          const parts = msg.split(' ');
          const bestMove = parts[1];
          if (!bestMove || bestMove === '(none)') return;

          const g = gameRef.current;
          const newGame = new Chess(g.fen());
          let moveResult;
          try {
            moveResult = newGame.move({
              from: bestMove.slice(0, 2),
              to: bestMove.slice(2, 4),
              promotion: bestMove[4] || 'q',
            });
          } catch {
            return;
          }
          if (!moveResult) return;

          const aiLastMove = { from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) };
          setLastMove(aiLastMove);
          setGame(newGame);
          setFen(newGame.fen());
          updateStatus(newGame);

          if (!newGame.isGameOver()) {
            // Append AI's SAN to history and push snapshot
            sanHistoryRef.current = [...sanHistoryRef.current, moveResult.san];
            const newSnap = { fen: newGame.fen(), lastMove: aiLastMove, sanHistory: [...sanHistoryRef.current] };
            setSnapshots(prev => [...prev.slice(0, snapIdxRef.current + 1), newSnap]);
            setSnapIdx(prev => prev + 1);
            setIsPlayerTurn(true);
            requestCoachingAnalysis(newGame);
          }
        }
      }
    });

    return removeListener;
  }, [addListener, updateStatus, requestCoachingAnalysis]);

  // Initial analysis
  useEffect(() => {
    if (playerColor === 'white') {
      const t = setTimeout(() => requestCoachingAnalysis(game), 800);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line

  function applyPlayerMove(sourceSquare, targetSquare, promotionPiece = 'q') {
    const newGame = new Chess(game.fen());
    let move;
    try {
      move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: promotionPiece });
    } catch {
      return false;
    }
    if (!move) return false;

    // Truncate any redo future when a new move is made
    setSnapshots(prev => prev.slice(0, snapIdxRef.current + 1));
    sanHistoryRef.current = [...sanHistoryRef.current.slice(0, snapIdxRef.current * 2), move.san];

    setLastMove({ from: sourceSquare, to: targetSquare });
    setMoveFrom('');
    setOptionSquares({});
    setGame(newGame);
    setFen(newGame.fen());
    updateStatus(newGame);

    if (newGame.isGameOver()) return true;

    setIsPlayerTurn(false);
    setCoachingMoves([]);
    setTimeout(() => requestAiMove(newGame, skillLevelRef.current), 300);
    return true;
  }

  function onDrop({ sourceSquare, targetSquare }) {
    if (!isPlayerTurn || gameOver || !targetSquare) return false;
    // Check for pawn promotion
    const piece = game.get(sourceSquare);
    if (piece?.type === 'p') {
      const rank = targetSquare[1];
      if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) {
        const moves = game.moves({ square: sourceSquare, verbose: true });
        if (moves.some(m => m.to === targetSquare)) {
          setPromotionDialog({ from: sourceSquare, to: targetSquare });
          return false;
        }
      }
    }
    return applyPlayerMove(sourceSquare, targetSquare);
  }

  function onSquareClick({ square }) {
    if (!isPlayerTurn || gameOver) return;
    setRightClickedSquares({});

    if (moveFrom) {
      // Check for promotion
      const piece = game.get(moveFrom);
      if (piece?.type === 'p') {
        const rank = square[1];
        if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) {
          const moves = game.moves({ square: moveFrom, verbose: true });
          if (moves.some(m => m.to === square)) {
            setPromotionDialog({ from: moveFrom, to: square });
            setMoveFrom('');
            setOptionSquares({});
            return;
          }
        }
      }

      const moved = applyPlayerMove(moveFrom, square);
      if (!moved) {
        // Try selecting new piece
        const p = game.get(square);
        if (p && p.color === game.turn() && p.color === playerColor[0]) {
          setMoveFrom(square);
          showMovesForSquare(square);
        } else {
          setMoveFrom('');
          setOptionSquares({});
        }
      }
      return;
    }

    const piece = game.get(square);
    if (!piece || piece.color !== game.turn() || piece.color !== playerColor[0]) return;
    setMoveFrom(square);
    showMovesForSquare(square);
  }

  function showMovesForSquare(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) return;
    const newSquares = { [square]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' } };
    moves.forEach(m => {
      newSquares[m.to] = {
        background: game.get(m.to)
          ? 'radial-gradient(circle, rgba(0,0,0,0.15) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,0.12) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    setOptionSquares(newSquares);
  }

  function onSquareRightClick({ square }) {
    const color = 'rgba(0, 0, 220, 0.35)';
    setRightClickedSquares(prev => ({
      ...prev,
      [square]: prev[square]?.backgroundColor === color ? undefined : { backgroundColor: color },
    }));
  }

  function startNewGame(color = playerColor, level = skillLevel) {
    send('stop');
    analysisActiveRef.current = false;
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameOver(false);
    setCoachingMoves([]);
    setLastMove(null);
    setMoveFrom('');
    setOptionSquares({});
    setRightClickedSquares({});
    setStatus('White to move');
    setAnalyzing(false);

    sanHistoryRef.current = [];
    if (color === 'black') {
      // Snapshot pushed after AI's first move
      setSnapshots([]);
      setSnapIdx(-1);
      setIsPlayerTurn(false);
      setTimeout(() => requestAiMove(newGame, level), 400);
    } else {
      setSnapshots([{ fen: newGame.fen(), lastMove: null, sanHistory: [] }]);
      setSnapIdx(0);
      setIsPlayerTurn(true);
      setTimeout(() => requestCoachingAnalysis(newGame), 400);
    }
  }

  function handlePlayerColorChange(color) {
    setPlayerColor(color);
    setBoardOrientation(color);
    startNewGame(color, skillLevel);
  }

  function handleSkillChange(level) {
    setSkillLevel(level);
  }

  function handleUndo() {
    if (snapIdx <= 0) return;
    send('stop');
    analysisActiveRef.current = false;
    const target = snapshots[snapIdx - 1];
    sanHistoryRef.current = target.sanHistory || [];
    const g = new Chess(target.fen);
    setGame(g);
    setFen(target.fen);
    setLastMove(target.lastMove);
    setSnapIdx(prev => prev - 1);
    setIsPlayerTurn(true);
    setGameOver(false);
    setCoachingMoves([]);
    setMoveFrom('');
    setOptionSquares({});
    updateStatus(g);
    setTimeout(() => requestCoachingAnalysis(g), 100);
  }

  function handleRedo() {
    if (snapIdx >= snapshots.length - 1) return;
    send('stop');
    analysisActiveRef.current = false;
    const target = snapshots[snapIdx + 1];
    sanHistoryRef.current = target.sanHistory || [];
    const g = new Chess(target.fen);
    setGame(g);
    setFen(target.fen);
    setLastMove(target.lastMove);
    setSnapIdx(prev => prev + 1);
    setIsPlayerTurn(true);
    setGameOver(false);
    setCoachingMoves([]);
    setMoveFrom('');
    setOptionSquares({});
    updateStatus(g);
    setTimeout(() => requestCoachingAnalysis(g), 100);
  }

  const customSquareStyles = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(155, 199, 0, 0.41)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(155, 199, 0, 0.41)' };
  }
  Object.assign(customSquareStyles, optionSquares, rightClickedSquares);

  const rankLabel = ['Best Move', '2nd Best', '3rd Best'];
  const rankColor = ['#4ade80', '#60a5fa', '#f472b6'];

  // Material strips
  const { capturedByWhite, capturedByBlack, diff } = getCapturedPieces(game);
  const topIsBlack = boardOrientation === 'white';
  const topCaptured = topIsBlack ? capturedByBlack : capturedByWhite;
  const topPieceColor = topIsBlack ? 'w' : 'b';
  const topAdvantage = topIsBlack ? Math.max(0, -diff) : Math.max(0, diff);
  const bottomCaptured = topIsBlack ? capturedByWhite : capturedByBlack;
  const bottomPieceColor = topIsBlack ? 'b' : 'w';
  const bottomAdvantage = topIsBlack ? Math.max(0, diff) : Math.max(0, -diff);

  // Move history pairs
  const sanHist = sanHistoryRef.current;
  const movePairs = [];
  for (let i = 0; i < sanHist.length; i += 2) movePairs.push([sanHist[i], sanHist[i+1]]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <span className="chess-icon">♟</span>
          <div>
            <h1>Chess Coach</h1>
            <p className="subtitle">Play against Stockfish with real-time AI coaching</p>
          </div>
        </div>
      </header>

      <div className="content-wrap">
      <div className="main-layout">
        {/* ── Board column ── */}
        <div className="board-col">
          <PlayerStrip
            isTop={true}
            colorChar={topIsBlack ? 'b' : 'w'}
            name="Stockfish"
            captured={topCaptured}
            pieceColor={topPieceColor}
            advantage={topAdvantage}
          />
          <div className="board-wrap">
            <Chessboard
              options={{
                id: 'chess-coach',
                position: fen,
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                onSquareRightClick: onSquareRightClick,
                boardOrientation: boardOrientation,
                squareStyles: customSquareStyles,
                animationDurationInMs: 200,
                boardStyle: { boxShadow: '0 2px 16px rgba(0,0,0,0.5)' },
                darkSquareStyle: { backgroundColor: '#769656' },
                lightSquareStyle: { backgroundColor: '#eeeed2' },
                canDragPiece: ({ piece }) => {
                  if (!isPlayerTurn || gameOver) return false;
                  return piece.pieceType[0].toLowerCase() === playerColor[0];
                },
              }}
            />
          </div>
          <PlayerStrip
            isTop={false}
            colorChar={topIsBlack ? 'w' : 'b'}
            name="You"
            captured={bottomCaptured}
            pieceColor={bottomPieceColor}
            advantage={bottomAdvantage}
          />
          <div className={`status-bar ${gameOver ? 'is-over' : ''} ${game.isCheck() && !gameOver ? 'in-check' : ''}`}>
            {status}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="right-col">
          {/* Move history */}
          <div className="panel moves-panel">
            <div className="panel-header">Moves</div>
            {movePairs.length > 0 ? (
              <div className="moves-scroll" ref={moveHistoryRef}>
                <table className="move-table">
                  <tbody>
                    {movePairs.map((pair, idx) => (
                      <tr key={idx} className={idx === movePairs.length - 1 ? 'move-row-last' : ''}>
                        <td className="move-num">{idx + 1}.</td>
                        <td className="move-cell">{pair[0]}</td>
                        <td className="move-cell">{pair[1] ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="moves-empty">No moves yet</div>
            )}
          </div>

          {/* Coach */}
          <div className="panel coach-panel">
            <div className="panel-header">
              <span>Coach</span>
              <div className="panel-header-actions">
                <span className="depth-badge">Stockfish 18</span>
                <button className="btn-ghost" onClick={() => setShowCoach(v => !v)}>
                  {showCoach ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {showCoach && (
              <div className="coaching-content">
                {gameOver ? (
                  <div className="coach-state">
                    <div className="state-icon">🏁</div>
                    <p>Game over! Start a new game below.</p>
                  </div>
                ) : !isPlayerTurn ? (
                  <div className="coach-state">
                    <div className="spinner-wrap"><div className="spinner" /></div>
                    <p>AI is thinking...</p>
                  </div>
                ) : analyzing ? (
                  <div className="coach-state">
                    <div className="spinner-wrap"><div className="spinner" /></div>
                    <p>Analyzing position...</p>
                  </div>
                ) : coachingMoves.length === 0 ? (
                  <div className="coach-state">
                    <div className="state-icon">♟</div>
                    <p>Your turn — make a move!</p>
                  </div>
                ) : (
                  <div className="moves-list">
                    <p className="moves-intro">Top recommendations:</p>
                    {coachingMoves.map((m, i) => (
                      <div key={m.uci} className="move-card">
                        <div className="move-card-header">
                          <span className="rank-pill" style={{ backgroundColor: rankColor[i] }}>{rankLabel[i]}</span>
                          <span className="move-san">{m.san}</span>
                          {m.scoreText && <span className="score-chip">{m.scoreText}</span>}
                        </div>
                        <p className="move-explanation">{m.explanation}</p>
                      </div>
                    ))}
                    <p className="coach-disclaimer">Suggestions only — you choose what to play!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="controls-panel">
        <div className="control-group">
          <label>Play as</label>
          <div className="btn-toggle">
            <button
              className={playerColor === 'white' ? 'active' : ''}
              onClick={() => handlePlayerColorChange('white')}
            >
              ♔ White
            </button>
            <button
              className={playerColor === 'black' ? 'active' : ''}
              onClick={() => handlePlayerColorChange('black')}
            >
              ♚ Black
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Board</label>
          <button
            className="btn-secondary"
            onClick={() => setBoardOrientation(o => o === 'white' ? 'black' : 'white')}
          >
            ⇅ Flip Board
          </button>
        </div>

        <div className="control-group">
          <label>AI Difficulty</label>
          <select
            value={skillLevel}
            onChange={e => handleSkillChange(Number(e.target.value))}
          >
            {SKILL_LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>History</label>
          <div className="btn-group-row">
            <button
              className="btn-secondary"
              onClick={handleUndo}
              disabled={snapIdx <= 0}
              title="Undo last move"
            >
              ← Undo
            </button>
            <button
              className="btn-secondary"
              onClick={handleRedo}
              disabled={snapIdx >= snapshots.length - 1}
              title="Redo move"
            >
              Redo →
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>&nbsp;</label>
          <button className="btn-primary" onClick={() => startNewGame()}>
            ↺ New Game
          </button>
        </div>
      </div>
      </div>

      {promotionDialog && (
        <div className="promotion-overlay" onClick={() => setPromotionDialog(null)}>
          <div className="promotion-modal" onClick={e => e.stopPropagation()}>
            <p>Promote pawn to:</p>
            <div className="promotion-pieces">
              {['q', 'r', 'b', 'n'].map(p => {
                const symbols = { q: '♛', r: '♜', b: '♝', n: '♞' };
                const names = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
                return (
                  <button key={p} onClick={() => {
                    applyPlayerMove(promotionDialog.from, promotionDialog.to, p);
                    setPromotionDialog(null);
                  }}>
                    <span>{symbols[p]}</span>
                    <small>{names[p]}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
