// Runs the WASM Stockfish build under Node and exposes it with a Web Worker-like
// interface, so tests exercise the real Engine class against the real engine.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Engine } from '../src/lib/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(root, 'node_modules/stockfish/bin/stockfish-18-lite-single.js');

export function createNodeWorker() {
  const proc = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '';
  const w = {
    onmessage: null,
    postMessage(cmd) { if (!proc.killed) proc.stdin.write(cmd + '\n'); },
    terminate() { proc.kill(); },
  };
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) w.onmessage?.({ data: line });
    }
  });
  return w;
}

export const createNodeEngine = () => new Engine(createNodeWorker);
