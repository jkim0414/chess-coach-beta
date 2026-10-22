// Each persona should actually play the openings it advertises.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { chooseMove, personaById } from '../src/lib/opponent.js';

const noEngine = { analyze: async () => null };

function seeded(seed) {
  let x = seed;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
}

async function replies(personaId, prefix, n = 300) {
  const g = new Chess();
  prefix.forEach((m) => g.move(m));
  const persona = personaById(personaId);
  const rng = seeded(42);
  const counts = {};
  for (let i = 0; i < n; i++) {
    const m = await chooseMove(noEngine, g.fen(), { persona, elo: 1500, ply: prefix.length, learnerColor: g.turn() === 'w' ? 'b' : 'w', rng });
    const san = new Chess(g.fen()).move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] }).san;
    counts[san] = (counts[san] || 0) + 1;
  }
  return counts;
}
const top = (c) => Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
const share = (c, san) => (c[san] || 0) / Object.values(c).reduce((a, b) => a + b, 0);

describe('personas play their openings', () => {
  it('as White', async () => {
    expect(top(await replies('classicist', []))).toBe('e4');
    expect(top(await replies('attacker', []))).toBe('e4');
    expect(top(await replies('strategist', []))).toBe('d4');
    expect(top(await replies('grinder', []))).toBe('d4');
    expect(top(await replies('grinder', ['d4', 'd5']))).toBe('Bf4');
    expect(share(await replies('attacker', ['e4', 'e5']), 'f4') + share(await replies('attacker', ['e4', 'e5']), 'Nf3')).toBeGreaterThan(0.6);
  });
  it('as Black against 1.e4', async () => {
    expect(top(await replies('classicist', ['e4']))).toBe('e5');
    expect(top(await replies('attacker', ['e4']))).toBe('c5');
    expect(top(await replies('grinder', ['e4']))).toBe('c6');
  });
  it('as Black against 1.d4', async () => {
    expect(top(await replies('classicist', ['d4']))).toBe('d5');
    expect(top(await replies('grinder', ['d4']))).toBe('d5');
    expect(['Nf6', 'f5']).toContain(top(await replies('attacker', ['d4'])));
  });
});
