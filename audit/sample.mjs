#!/usr/bin/env node
// Coaching audit, part 3: a varied sample of coach messages, with the positions and engine
// lines behind them, for a human (or agent) reviewer to read like a learner would.
//
//   node audit/sample.mjs [perCategory=30]   → audit/out/sample-<category>.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { formatLine, pvToSan, nullMoveFen } from '../src/lib/chessutil.js';

const N = Number(process.argv[2] || 30);
const files = readdirSync('audit/out').filter((f) => /^shard-\d+\.json$/.test(f));
const records = files.flatMap((f) => JSON.parse(readFileSync(`audit/out/${f}`, 'utf8')));
const games = Object.fromEntries(records.filter((r) => r.type === 'game').map((r) => [r.gameId, r]));

let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const line = (fen, pv) => (fen && pv?.length ? formatLine(fen, pvToSan(fen, pv, 10)) : null);
const userOf = (r) => games[r.gameId]?.userColor;

function lastUserPly(r) {
  const last = r.ctx?.last || [];
  return [...last].reverse().find((p) => p.by === 'user') || null;
}

function plyCtx(p) {
  return p && { fenBefore: p.fenBefore, move: p.san, engineBest: line(p.fenBefore, p.bestPv), afterYourMove: line(p.fenBefore, p.movePv) };
}

const cats = { threats: [], mistakes: [], plans: [], feed: [] };
const seen = new Set();
const push = (cat, item) => {
  const key = cat + JSON.stringify(item.message);
  if (seen.has(key)) return;
  seen.add(key);
  cats[cat].push(item);
};

for (const r of records) {
  const you = userOf(r);
  if (r.type === 'threat') {
    push('threats', { you, fen: r.fen, message: r.text, engineThreatLine: line(nullMoveFen(r.fen), r.nullPv), countsAsRealThreat: r.real });
  } else if (r.type === 'callout' && r.shown?.filter(Boolean).length) {
    const t = r.ctx?.turn;
    const msg = r.shown.filter(Boolean);
    const base = { you, kind: r.kind, state: r.state, reason: r.reason, message: msg, fen: t?.fen || r.ctx?.fen, engineLines: t ? t.lines.map((pv) => line(t.fen, pv)) : [] };
    if (r.kind === 'threat') push('threats', { ...base, engineThreatLine: t?.threatPv ? line(nullMoveFen(t.fen), t.threatPv) : null });
    else if (r.kind === 'intervention' && r.state === 'decide') push('mistakes', { ...base, yourMove: plyCtx(lastUserPly(r)) });
    else push('plans', { ...base, plan: t?.planPv ? line(t.fen, t.planPv) : null });
  } else if (r.type === 'plan') {
    push('plans', { you, fen: r.fen, message: [r.text, ...r.hints.map((h, i) => `Hint ${i + 1}: ${h.text}`)], engineLine: line(r.fen, r.pv), score: r.score });
  } else if (r.type === 'mistake' && r.lossWin >= 0.05) {
    push('mistakes', { you, fen: r.fen, move: r.san, message: [r.why, r.refutation && `What happens next: ${r.refutation}`, r.consequence].filter(Boolean), afterYourMove: line(r.fen, r.movePv), lossInWinChance: r.lossWin });
  } else if (r.type === 'feed') {
    const p = lastUserPly(r);
    push('feed', { you, tone: r.tone, message: [r.title, r.text, r.reveal].filter(Boolean), yourMove: plyCtx(p) });
  }
}

for (const [cat, items] of Object.entries(cats)) {
  const pick = [...items].sort(() => rand() - 0.5).slice(0, N);
  writeFileSync(`audit/out/sample-${cat}.json`, JSON.stringify(pick, null, 1));
  console.log(`${cat}: ${pick.length} of ${items.length}`);
}
