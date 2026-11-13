#!/usr/bin/env node
// Coaching audit, part 4: everything the learner was actually shown at the moments that
// matter — each intervention card, threat answer and inaccuracy note, once — for reading
// start to finish. The fact-checker (check.mjs) only catches what it has a rule for; a
// message can be true clause by clause and still tell the wrong story.
//
//   node audit/cards.mjs            (after `npm run audit:coach`)
import { readdirSync, readFileSync } from 'node:fs';

const records = readdirSync('audit/out').filter((f) => /^shard-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`audit/out/${f}`, 'utf8')));
const seen = new Set();
const section = (title, rows) => {
  const fresh = rows.filter((t) => t && !seen.has(t) && seen.add(t));
  console.log(`\n=== ${title} (${fresh.length}) ===`);
  for (const t of fresh) console.log(`- ${t}`);
};
const shown = (r) => r.shown.filter(Boolean).join(' | ');
const callouts = records.filter((r) => r.type === 'callout');

section('Intervention cards: title | why | what happens next', callouts.filter((r) => r.kind === 'intervention' && r.state === 'decide').map(shown));
section('Finishing a combination: wrong move', callouts.filter((r) => r.kind === 'drill' && r.shown?.length > 1).map(shown));
section('Threat answers', callouts.filter((r) => r.kind === 'threat' && r.state === 'answered').map(shown));
section('Inaccuracy notes', records.filter((r) => r.type === 'feed' && r.tone === 'inaccuracy').map((r) => [r.title, r.text, r.reveal].filter(Boolean).join(' | ')));
section('Other coach notes', records.filter((r) => r.type === 'feed' && ['best', 'tactic'].includes(r.tone)).map((r) => [r.title, r.text].filter(Boolean).join(' | ')));
