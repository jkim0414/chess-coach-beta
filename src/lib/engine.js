// Stockfish wrapper with a strict job queue.
//
// Every search is a job that resolves with its result. Jobs run one at a time, and
// a job only finishes when the engine's own `bestmove` for it arrives, so a `stop`
// can never leak a stale bestmove into the next search. Cancelled jobs resolve to
// null; callers treat null as "this result no longer matters".

export function parseInfo(line) {
  const t = line.split(' ');
  const out = { depth: 0, multipv: 1, score: null, pv: [], bound: null };
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': out.depth = parseInt(t[++i], 10); break;
      case 'multipv': out.multipv = parseInt(t[++i], 10); break;
      case 'nodes': out.nodes = parseInt(t[++i], 10); break;
      case 'score':
        out.score = { type: t[i + 1], value: parseInt(t[i + 2], 10) };
        i += 2;
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') out.bound = t[++i];
        break;
      case 'pv':
        out.pv = t.slice(i + 1);
        i = t.length;
        break;
      default: break;
    }
  }
  return out;
}

export class Engine {
  constructor(createWorker) {
    this.queue = [];
    this.current = null;
    this.ready = false;
    this.worker = createWorker();
    this.worker.onmessage = (e) => this._onLine(typeof e.data === 'string' ? e.data : String(e.data));
    this.worker.postMessage('uci');
  }

  _post(cmd) { this.worker.postMessage(cmd); }

  _onLine(line) {
    if (!this.ready) {
      if (line === 'uciok') {
        this._post('setoption name Hash value 32');
        this._post('isready');
      } else if (line === 'readyok') {
        this.ready = true;
        this._pump();
      }
      return;
    }
    const job = this.current;
    if (!job) return;
    if (job.kind === 'sync') {
      if (line === 'readyok') this._finish(job, true);
      return;
    }
    if (line.startsWith('info') && line.includes(' pv ')) {
      const info = parseInfo(line);
      if (!info.score || !info.pv.length) return;
      const prev = job.lines[info.multipv];
      if (!prev || info.depth > prev.depth || (info.depth === prev.depth && !info.bound)) {
        job.lines[info.multipv] = info;
      }
      job.onInfo?.(info);
    } else if (line.startsWith('info') && line.includes('score mate 0')) {
      job.mated = true;
    } else if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      const lines = Object.values(job.lines).sort((a, b) => a.multipv - b.multipv);
      this._finish(job, job.cancelled ? null : { fen: job.fen, lines, bestmove: best === '(none)' ? null : best, mated: !!job.mated });
    }
  }

  _finish(job, value) {
    this.current = null;
    job.resolve(value);
    this._pump();
  }

  _pump() {
    if (!this.ready || this.current) return;
    const job = this.queue.shift();
    if (!job) return;
    this.current = job;
    if (job.kind === 'sync') {
      for (const cmd of job.commands) this._post(cmd);
      this._post('isready');
      return;
    }
    this._post(`setoption name MultiPV value ${job.multipv}`);
    this._post(`position fen ${job.fen}`);
    let go = 'go';
    if (job.depth) go += ` depth ${job.depth}`;
    if (job.movetime) go += ` movetime ${job.movetime}`;
    if (job.nodes) go += ` nodes ${job.nodes}`;
    if (job.searchmoves?.length) go += ` searchmoves ${job.searchmoves.join(' ')}`;
    this._post(go);
  }

  /**
   * Analyse a position. Scores are from the side to move's point of view.
   * @returns {Promise<{fen, lines:[{multipv, depth, score:{type,value}, pv:string[]}], bestmove} | null>}
   */
  analyze(fen, { depth = 12, movetime, nodes, multipv = 1, searchmoves, onInfo } = {}) {
    return new Promise((resolve) => {
      this.queue.push({ kind: 'search', fen, depth, movetime, nodes, multipv, searchmoves, onInfo, resolve, lines: {} });
      this._pump();
    });
  }

  /** Cancel every queued and running search. Their promises resolve to null. */
  cancel() {
    for (const job of this.queue) job.resolve(null);
    this.queue = [];
    if (this.current && this.current.kind === 'search' && !this.current.cancelled) {
      this.current.cancelled = true;
      this._post('stop');
    }
  }

  newGame() {
    this.cancel();
    return new Promise((resolve) => {
      this.queue.push({ kind: 'sync', commands: ['ucinewgame'], resolve });
      this._pump();
    });
  }

  terminate() {
    this.cancel();
    this._post('quit');
    this.worker.terminate?.();
  }
}

let shared = null;
export function getEngine() {
  if (!shared) shared = new Engine(() => new Worker('/stockfish.js'));
  return shared;
}
