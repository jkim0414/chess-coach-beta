import { useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const MARK_STYLES = {
  hint: { boxShadow: 'inset 0 0 0 4px rgba(34,197,94,0.95)' },
  threat: { background: 'radial-gradient(circle, rgba(239,68,68,0.55) 0%, rgba(239,68,68,0.25) 70%)' },
  target: { boxShadow: 'inset 0 0 0 4px rgba(96,165,250,0.95)' },
  good: { background: 'rgba(34,197,94,0.45)' },
  bad: { background: 'rgba(239,68,68,0.45)' },
  pick: { boxShadow: 'inset 0 0 0 4px rgba(250,204,21,0.95)' },
};

const PROMO = [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']];
const GLYPH = { w: { q: '♕', r: '♖', b: '♗', n: '♘' }, b: { q: '♛', r: '♜', b: '♝', n: '♞' } };

/**
 * Board with click-or-drag moves, legal-move dots, promotion picker, arrows and
 * coach marks. `movable` is the colour allowed to move ('w' | 'b' | null).
 * `onMove(from, to, promotion)` returns true if accepted. `onPick(square)`, when
 * given, turns clicks into square selection (e.g. "click the threatened piece").
 */
export default function Board({ fen, orientation = 'white', movable = null, onMove, onPick, arrows = [], marks = {}, lastMove = null, id = 'board' }) {
  const game = useMemo(() => { try { return new Chess(fen); } catch { return new Chess(); } }, [fen]);
  // Selection, promotion choice and right-click marks belong to one position; a new fen clears them.
  const [ui, setUi] = useState({ fen, selected: null, promo: null, marks: {} });
  const cur = ui.fen === fen ? ui : { fen, selected: null, promo: null, marks: {} };
  const { selected, promo } = cur;
  const userMarks = cur.marks;
  const patch = (p) => setUi((u) => ({ ...(u.fen === fen ? u : { fen, selected: null, promo: null, marks: {} }), ...p }));
  const setSelected = (sq) => patch({ selected: sq });
  const setPromo = (pr) => patch({ promo: pr });
  const setUserMarks = (fn) => setUi((u) => {
    const base = u.fen === fen ? u : { fen, selected: null, promo: null, marks: {} };
    return { ...base, marks: typeof fn === 'function' ? fn(base.marks) : fn };
  });

  const canMove = !!movable && game.turn() === movable && !game.isGameOver();
  const targets = useMemo(() => (selected ? game.moves({ square: selected, verbose: true }) : []), [game, selected]);

  function needsPromotion(from, to) {
    const p = game.get(from);
    return p?.type === 'p' && ((p.color === 'w' && to[1] === '8') || (p.color === 'b' && to[1] === '1'))
      && game.moves({ square: from, verbose: true }).some((m) => m.to === to);
  }

  function attempt(from, to) {
    if (!canMove || from === to) return false;
    if (needsPromotion(from, to)) { setPromo({ from, to }); return false; }
    const legal = game.moves({ square: from, verbose: true }).some((m) => m.to === to);
    if (!legal) return false;
    setSelected(null);
    return onMove?.(from, to, 'q') ?? false;
  }

  function handleClick({ square }) {
    if (onPick) { onPick(square); return; }
    setUserMarks({});
    if (!canMove) return;
    const p = game.get(square);
    if (selected) {
      if (targets.some((m) => m.to === square)) { attempt(selected, square); return; }
      if (p && p.color === movable) { setSelected(square); return; }
      setSelected(null);
      return;
    }
    if (p && p.color === movable) setSelected(square);
  }

  function handleRightClick({ square }) {
    setUserMarks((m) => ({ ...m, [square]: m[square] ? undefined : { background: 'rgba(59,130,246,0.45)' } }));
  }

  const squareStyles = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { background: 'rgba(250,204,21,0.32)' };
    squareStyles[lastMove.to] = { background: 'rgba(250,204,21,0.42)' };
  }
  if (game.isCheck()) {
    const k = game.board().flat().find((p) => p && p.type === 'k' && p.color === game.turn());
    if (k) squareStyles[k.square] = { background: 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(239,68,68,0.35) 55%, transparent 75%)' };
  }
  if (selected) squareStyles[selected] = { background: 'rgba(250,204,21,0.5)' };
  for (const m of targets) {
    squareStyles[m.to] = {
      ...squareStyles[m.to],
      background: game.get(m.to)
        ? 'radial-gradient(circle, transparent 62%, rgba(0,0,0,0.22) 63%)'
        : 'radial-gradient(circle, rgba(0,0,0,0.22) 21%, transparent 23%)',
    };
  }
  for (const [s, kind] of Object.entries(marks)) if (kind && MARK_STYLES[kind]) squareStyles[s] = { ...squareStyles[s], ...MARK_STYLES[kind] };
  for (const [s, st] of Object.entries(userMarks)) if (st) squareStyles[s] = { ...squareStyles[s], ...st };

  return (
    <div className="board" data-picking={onPick ? 'true' : undefined}>
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          squareStyles,
          arrows,
          allowDrawingArrows: true,
          animationDurationInMs: 180,
          darkSquareStyle: { backgroundColor: 'var(--sq-dark)' },
          lightSquareStyle: { backgroundColor: 'var(--sq-light)' },
          boardStyle: { borderRadius: '6px', overflow: 'hidden' },
          canDragPiece: ({ piece }) => canMove && !onPick && piece.pieceType[0] === movable,
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? attempt(sourceSquare, targetSquare) : false),
          onSquareClick: handleClick,
          onSquareRightClick: handleRightClick,
        }}
      />
      {promo && (
        <div className="promo" onClick={() => setPromo(null)}>
          <div className="promo-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Promote pawn">
            {PROMO.map(([p, name]) => (
              <button key={p} title={name} onClick={() => { const { from, to } = promo; setPromo(null); onMove?.(from, to, p); }}>
                {GLYPH[game.turn()][p]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
