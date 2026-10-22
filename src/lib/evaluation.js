// Turning engine scores into the numbers the coach reasons with.

/** Engine score → centipawns from the side to move's view (mates mapped to ±10000-ish). */
export function cpOf(score) {
  if (!score) return 0;
  if (score.type === 'mate') {
    if (score.value === 0) return -10000;
    return score.value > 0 ? 10000 - score.value * 10 : -10000 - score.value * 10;
  }
  return score.value;
}

/** Expected score (0..1) for the side to move. Lichess's logistic model. */
export function winOf(score) {
  if (!score) return 0.5;
  if (score.type === 'mate') return score.value > 0 ? 1 : 0;
  return 1 / (1 + Math.exp(-0.00368208 * score.value));
}

export const negate = (score) => (score ? { type: score.type, value: -score.value } : null);

export const GRADES = {
  best: { label: 'Best', symbol: '★', tone: 'best' },
  excellent: { label: 'Excellent', symbol: '!', tone: 'good' },
  good: { label: 'Good', symbol: '✓', tone: 'good' },
  book: { label: 'Book', symbol: '📖', tone: 'book' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', tone: 'inaccuracy' },
  mistake: { label: 'Mistake', symbol: '?', tone: 'mistake' },
  blunder: { label: 'Blunder', symbol: '??', tone: 'blunder' },
};

// Thresholds on lost expected score (0..1), close to chess.com's published bands.
export const LOSS = { excellent: 0.02, good: 0.05, inaccuracy: 0.1, mistake: 0.2 };

export function gradeFromLoss(loss, isBest = false) {
  if (isBest || loss <= 0.005) return 'best';
  if (loss <= LOSS.excellent) return 'excellent';
  if (loss <= LOSS.good) return 'good';
  if (loss <= LOSS.inaccuracy) return 'inaccuracy';
  if (loss <= LOSS.mistake) return 'mistake';
  return 'blunder';
}

/** Lichess-style move accuracy (0–100) from expected-score loss (0..1). */
export function moveAccuracy(loss) {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, loss) * 100) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export function gameAccuracy(losses) {
  if (!losses.length) return null;
  // Harmonic-ish blend so one blunder isn't hidden by twenty book moves.
  const accs = losses.map(moveAccuracy);
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harmonic = accs.length / accs.reduce((sum, a) => sum + 1 / Math.max(a, 1), 0);
  return Math.round((mean + harmonic) / 2);
}

/** "+1.4", "−0.3", "M3", "−M2" from a given colour's perspective. */
export function formatScore(score, sideToMove, perspective) {
  if (!score) return '';
  const sign = sideToMove === perspective ? 1 : -1;
  if (score.type === 'mate') {
    if (score.value === 0) return sideToMove === perspective ? '−#' : '#';
    const v = score.value * sign;
    return v > 0 ? `M${v}` : `−M${-v}`;
  }
  const v = (score.value * sign) / 100;
  if (Math.abs(v) < 0.05) return '0.0';
  return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1);
}

/** Plain-English verdict for an expected score (side's own perspective). */
export function verdict(win) {
  if (win >= 0.97) return 'winning';
  if (win >= 0.8) return 'clearly better';
  if (win >= 0.62) return 'slightly better';
  if (win > 0.38) return 'about equal';
  if (win > 0.2) return 'slightly worse';
  if (win > 0.03) return 'clearly worse';
  return 'losing';
}

/** White's expected score, for an eval bar. */
export function whiteWin(score, sideToMove) {
  const w = winOf(score);
  return sideToMove === 'w' ? w : 1 - w;
}
