// Minimal Stockfish (WASM, run under Node) driver for offline content checks.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(root, 'node_modules/stockfish/bin/stockfish-18-lite-single.js');

export function scoreToCp(score) {
  if (!score) return 0;
  if (score.type === 'mate') return score.value > 0 ? 10000 - score.value * 10 : -10000 - score.value * 10;
  return score.value;
}

export class NodeEngine {
  constructor() {
    this.proc = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.buf = '';
    this.waiters = [];
    this.lines = [];
    this.proc.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        this.lines.push(line);
        for (const w of [...this.waiters]) {
          if (w.match(line)) {
            this.waiters = this.waiters.filter((x) => x !== w);
            w.resolve([...this.lines]);
            this.lines = [];
          }
        }
      }
    });
  }

  send(cmd) { this.proc.stdin.write(cmd + '\n'); }

  waitFor(match) {
    return new Promise((resolve) => this.waiters.push({ match, resolve }));
  }

  async init() {
    this.send('uci');
    await this.waitFor((l) => l === 'uciok');
    this.send('setoption name Hash value 64');
    this.send('isready');
    await this.waitFor((l) => l === 'readyok');
  }

  // Returns [{ multipv, score:{type,value}, pv:[uci] }] from the side to move's view.
  async analyse(fen, { depth = 14, multipv = 1, searchmoves = null } = {}) {
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}${searchmoves ? ' searchmoves ' + searchmoves.join(' ') : ''}`);
    const out = await this.waitFor((l) => l.startsWith('bestmove'));
    const best = {};
    for (const l of out) {
      if (!l.startsWith('info') || !l.includes(' pv ')) continue;
      const t = l.split(' ');
      const get = (k) => t[t.indexOf(k) + 1];
      const d = parseInt(get('depth'), 10);
      const mpv = t.includes('multipv') ? parseInt(get('multipv'), 10) : 1;
      const si = t.indexOf('score');
      const score = { type: t[si + 1], value: parseInt(t[si + 2], 10) };
      const pv = t.slice(t.indexOf('pv') + 1);
      if (!best[mpv] || d >= best[mpv].depth) best[mpv] = { multipv: mpv, depth: d, score, pv };
    }
    return Object.values(best).sort((a, b) => a.multipv - b.multipv);
  }

  quit() { this.send('quit'); this.proc.stdin.end(); }
}
