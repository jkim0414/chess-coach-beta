#!/usr/bin/env node
// The whole coaching audit: simulate games in parallel shards, fact-check, sample for review.
//
//   npm run audit:coach            (SHARDS=5 GAMES=8 MAX_PLIES=80 by default)
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';

const SHARDS = Number(process.env.SHARDS || 5);
const GAMES = process.env.GAMES || '8';
const MAX_PLIES = process.env.MAX_PLIES || '80';

mkdirSync('audit/out', { recursive: true });
for (const f of readdirSync('audit/out')) if (/^(shard-\d+|sample-\w+|report)\.json$/.test(f)) rmSync(`audit/out/${f}`);

const run = (cmd, args, env = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))));
});

console.log(`Simulating ${SHARDS * Number(GAMES)} games in ${SHARDS} shards…`);
await Promise.all(Array.from({ length: SHARDS }, (_, s) =>
  run('npx', ['vitest', 'run', '--config', 'vitest.audit.config.js', '--reporter=dot'], { SHARD: String(s), GAMES, MAX_PLIES })));
await run('node', ['audit/check.mjs']);
await run('node', ['audit/sample.mjs']);
