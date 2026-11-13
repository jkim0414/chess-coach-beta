#!/usr/bin/env node
// Coaching audit, part 2: fact-check every recorded coach message against the positions
// and engine lines it was produced from.
//
//   node audit/check.mjs            → audit/out/report.json + a printed summary
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { boardOf, attackersOf, see, between } from '../src/lib/tactics.js';
import { nullMoveFen, playLine, materialBalance, turnOf } from '../src/lib/chessutil.js';
import { explainThreat, naiveRecapture, settle } from '../src/lib/explain.js';

const files = readdirSync('audit/out').filter((f) => /^shard-\d+\.json$/.test(f));
const records = files.flatMap((f) => JSON.parse(readFileSync(`audit/out/${f}`, 'utf8')));
const issues = [];
const flag = (check, r, detail) => issues.push({ check, type: r.type, gameId: r.gameId, ply: r.ply, detail, text: textOf(r).slice(0, 400), fen: r.fen || r.ctx?.fen || null });

const PIECES = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const SAN_RE = /^(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?$/;
// A bare token that can only be a move (not a square name like "e4").
const SURELY_SAN = /^(?:…|[KQRBN]|[a-h]x|O-O)|[+#=]/;

function textOf(r) {
  if (r.shown) return r.shown.filter(Boolean).join(' ‖ ');
  return [r.title, r.text, r.reveal, r.why, r.refutation, r.consequence, r.hintText, ...(r.hints || []).map((h) => h.text)].filter(Boolean).join(' ‖ ');
}

/** Every position the message could be talking about. */
function contextPositions(r) {
  const fens = new Set();
  const add = (fen, pv) => {
    if (!fen) return;
    fens.add(fen);
    if (pv?.length) for (const s of playLine(fen, pv, 16)) { fens.add(s.fenBefore); fens.add(s.fenAfter); }
  };
  add(r.fen, r.pv); add(r.fen, r.movePv); add(r.fen, r.bestPv);
  if (r.fen) { const nf = nullMoveFen(r.fen); if (nf) { add(nf, r.nullPv); add(nf, r.oppThreatPv); fens.add(nf); } }
  if (r.threatPv && r.pv?.length) {
    const [s0] = playLine(r.fen, [r.pv[0]]);
    const nf = s0 && nullMoveFen(s0.fenAfter);
    if (nf) add(nf, r.threatPv);
  }
  if (r.ctx) {
    add(r.ctx.fen);
    for (const p of r.ctx.last || []) { add(p.fenBefore, p.bestPv); add(p.fenBefore, p.movePv); add(p.fenAfter); add(p.fenBefore, [p.uci]); }
    const t = r.ctx.turn;
    if (t) {
      for (const pv of t.lines) add(t.fen, pv);
      add(t.fen, t.planPv);
      const nf = nullMoveFen(t.fen);
      add(nf, t.threatPv); add(nf, t.oppThreatPv);
      if (t.planPv?.length && t.planThreatPv) { const [s0] = playLine(t.fen, [t.planPv[0]]); add(s0 && nullMoveFen(s0.fenAfter), t.planThreatPv); }
      if (t.threatPv) {
        const rc = naiveRecapture(t.fen, explainThreat(t.fen, t.threatPv));
        if (rc) fens.add(rc.fen);
      }
    }
  }
  // A second try ("Bxa4 isn’t it either", "Bxa4 is playable, but…") talks about the move just tried.
  const tried = r.shown?.join(' ').match(/(\S+) (?:isn’t it|is playable|keeps you ahead|lets)/)?.[1];
  if (tried && r.ctx?.turn?.fen) {
    const g = new Chess(r.ctx.turn.fen);
    try { if (g.move(tried, { strict: false })) fens.add(g.fen()); } catch { /* not a move */ }
  }
  if (r.type === 'threat') {
    const rc = naiveRecapture(r.fen, explainThreat(r.fen, r.nullPv));
    if (rc) fens.add(rc.fen);
  }
  // "X threatens Y" talks about the position after X with the other side to move again.
  for (const f of [...fens]) { const nf = f && nullMoveFen(f); if (nf) fens.add(nf); }
  return [...fens].filter(Boolean);
}

const fieldsOf = (fen) => { const p = fen.split(' '); return { turn: p[1], num: parseInt(p[5] || '1', 10) }; };
function legalIn(fen, san) {
  try { return new Chess(fen).move(san, { strict: false }); } catch { return null; }
}

// ── checks ─────────────────────────────────────────────────────────────────
function hygiene(r) {
  const t = textOf(r);
  if (!t) return;
  const rules = [
    [/\bundefined\b|\bNaN\b|\[object|\bnull\b/, 'placeholder leaked'],
    [/ {2,}/, 'double space'],
    [/ [,.;:](?!\.)/, 'space before punctuation'],
    [/\b([a-z]{3,}) \1\b/i, 'repeated word'],
    [/\b(?:White|Black) \d+\./, 'side label on a move'],
    [/×/, 'multiplication sign'],
    [/about equal to about equal|from (\w[\w ]*) to \1\b/, 'vacuous comparison'],
    [/(?<![.…\d])\.\.(?!\.)/, 'stray double period'],
    [/\(\s*\)|— —|, ,/, 'empty fragment'],
    [/: (?:It|Your|This|The) [a-z]/, 'sentence glued on after a colon'],
    [/forks? the pawn on [a-h][1-8] and the pawn/, 'a “fork” of two pawns'],
  ];
  for (const [re, name] of rules) if (re.test(t)) flag('hygiene: ' + name, r, t.match(re)?.[0]);
}

// Moves are checked in reading order: each one must be legal right after the previous move
// mentioned, or in one of the positions the message could be talking about.
function moveReferences(r, positions) {
  const tokens = textOf(r).split(/\s+/);
  let cur = null; // the position after the last move mentioned
  const tryAt = (fen, san) => { const g = new Chess(fen); try { return g.move(san, { strict: false }) ? g.fen() : null; } catch { return null; } };
  for (const raw of tokens) {
    const tok = raw.replace(/^[(“"‘]+|[)”"’,.;:!?—]+$/g, '');
    const m = tok.match(/^(\d+)\.(\.\.)?(.+)$/);
    if (m) {
      const num = parseInt(m[1], 10), side = m[2] ? 'b' : 'w', san = m[3];
      if (!SAN_RE.test(san)) continue;
      const fits = (f) => { const x = fieldsOf(f); return x.turn === side && x.num === num; };
      const next = (cur && fits(cur) && tryAt(cur, san)) || positions.filter(fits).map((f) => tryAt(f, san)).find(Boolean);
      if (!next) { flag('move: numbered move not legal in any context position', r, tok); cur = null; continue; }
      cur = next;
      continue;
    }
    const bare = tok.replace(/^…/, '');
    if (!SAN_RE.test(bare) || !SURELY_SAN.test(tok)) continue;
    const black = tok.startsWith('…');
    const fits = (f) => !black || fieldsOf(f).turn === 'b';
    const next = (cur && fits(cur) && tryAt(cur, bare)) || positions.filter(fits).map((f) => tryAt(f, bare)).find(Boolean);
    if (!next) flag('move: SAN not legal in any context position', r, tok);
    cur = next || null;
  }
}

function pieceClaims(r, positions) {
  const t = textOf(r);
  for (const m of t.matchAll(/\b(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/g)) {
    const type = PIECES[m[1]], sq = m[2];
    if (!positions.some((f) => new Chess(f).get(sq)?.type === type)) flag('claim: no such piece on that square in context', r, m[0]);
  }
  for (const m of t.matchAll(/nothing defends ([a-h][1-8])|nothing defends it/g)) {
    const sq = m[1];
    if (!sq) continue;
    const ok = positions.some((f) => {
      const B = boardOf(f); const p = B.get(sq);
      return p && attackersOf(B, sq, p.color).length === 0;
    });
    if (!ok) flag('claim: "nothing defends" is false in every context position', r, m[0]);
  }
}

function hintLadder(r) {
  if (r.type !== 'plan' || !r.hints?.length || !r.pv?.length) return;
  const [s0] = playLine(r.fen, [r.pv[0]]);
  if (!s0) return;
  const san = s0.san.replace(/[+#]$/, '');
  const [h1, h2, h3] = r.hints.map((h) => h.text);
  if (h1 && new RegExp(`(^|[^A-Za-z])${san.replace(/[+]/g, '\\+')}([^A-Za-z0-9]|$)`).test(h1)) flag('hint: level 1 reveals the move', r, h1);
  if (h2 && !h2.includes(s0.from)) flag('hint: level 2 does not name the piece’s square', r, h2);
  if (h3 && !h3.includes(san)) flag('hint: level 3 does not contain the move', r, h3);
  if (h1 && /^(No tactic here|A trade helps)/.test(h1) && r.threatPv) flag('hint: generic level-1 despite a threat', r, h1);
}

function threatClaims(r) {
  if (r.type !== 'threat') return;
  const nf = nullMoveFen(r.fen);
  const steps = playLine(nf, r.nullPv || [], 12);
  if (/threatens mate/.test(r.text)) {
    const mi = steps.findIndex((s) => s.mate);
    if (mi < 0 || steps[mi].color !== fieldsOf(nf).turn) flag('threat: mate claimed but not delivered by the threatening side', r, r.text);
  }
  if (r.real) {
    const g = new Chess(nf);
    let mv = null;
    try { mv = g.move({ from: r.move.from, to: r.move.to, promotion: 'q' }); } catch { mv = null; }
    if (!r.mate && (!mv || !mv.captured)) flag('threat: "real" threat is not a capture or mate', r, r.text);
    const explained = /Taking back with|discovered check|double check|\+/.test(r.text.split(/[,—]/)[0] + (r.text.match(/Taking back with|discovered check|double check/)?.[0] || ''));
    if (mv?.captured && (see(boardOf(nf), r.move.to, mv.color, r.move.from) ?? 0) <= 0 && !r.mate && !explained) flag('threat: defended capture with no reason why taking back fails', r, r.text);
  }
}

function planClaims(r) {
  if (r.type !== 'plan') return;
  const [s0] = playLine(r.fen, [r.pv[0]]);
  if (!s0) return;
  if (/takes care of the threat/.test(r.text) && r.oppThreat?.move) {
    const tm = r.oppThreat.move;
    let mv = null;
    try { mv = new Chess(s0.fenAfter).move({ from: tm.from, to: tm.to, promotion: 'q' }); } catch { mv = null; }
    if (mv?.captured && (see(boardOf(s0.fenAfter), tm.to, mv.color, tm.from) ?? 0) > 0) flag('plan: claims to take care of a threat that still works', r, r.text);
  }
  const th = r.text.match(/threatens ([^\s,(]+)/);
  if (th && r.threatPv) {
    const san = th[1].replace(/^…/, '');
    if (!/mate/.test(san)) {
      const before = legalIn(r.fen.replace(/ [wb] /, (x) => x), san);
      void before;
      const nf = nullMoveFen(s0.fenAfter);
      if (nf && !legalIn(nf, san)) flag('plan: threatened move not legal after the move', r, th[0]);
    }
  }
}

function mistakeClaims(r) {
  if (r.type !== 'mistake') return;
  // (The probe explains any non-best move, so a near-best move getting "mistake" wording is expected here.)
  const N = { once: 1, twice: 2, three: 3, four: 4 };
  const m = (r.why || '').match(/attacked (once|twice|three|four)\S* (?:times )?and defended only (once|twice|three|four)/);
  if (m && N[m[1]] <= N[m[2]]) flag('mistake: "attacked N, defended only M" with N ≤ M', r, m[0]);
}

function threatAudience(r) {
  // A callout never tells the learner about a threat that only exists after a different move.
  if (r.type !== 'callout' || r.kind !== 'threat' || !r.shown?.[0]) return;
  const t = r.ctx?.turn;
  if (t && !t.threatPv) flag('threat: callout without a recorded threat line', r, r.shown[0]);
}

function gradeConsistency(r) {
  if (r.type !== 'feed') return;
  if (/Inaccuracy|Mistake|Blunder/.test(r.title || '') && /Mistake|Blunder/.test(r.title) && r.tone === 'inaccuracy') flag('grade: title and tone disagree', r, r.title);
}

// ── claims that are "true" clause by clause but tell the wrong story ───────────
const WORTH = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 };
const HOW_MANY = { a: 1, the: 1, your: 1, two: 2, three: 3, four: 4, five: 5 };
/** "a bishop and two pawns" → 5 */
function listValue(text) {
  let v = 0;
  for (const m of text.matchAll(/\b(a|the|your|two|three|four|five) (pawn|knight|bishop|rook|queen)s?\b/g)) v += HOW_MANY[m[1]] * WORTH[m[2]];
  return v;
}

function storyClaims(r, positions) {
  const t = textOf(r);
  if (!t) return;
  // Reported: "What happens next: 33...Rc1#: you’ve won a pawn" — a mate summed up as material.
  if (/#[:,] |# — (?!checkmate)|#\S* ‖ [^‖]*(?:comfortable position|you’ve (?:won|lost|given))/.test(t) && r.type !== 'plan') {
    if (/#: |#[^‖]*‖[^‖]*(?:comfortable position|you’ve (?:won|lost|given)|material is level)/.test(t)) flag('story: a line ending in mate is summed up as material or position', r, t.match(/\S*#[^‖]{0,60}/)?.[0]);
  }
  // Reported: "the king on f7 can take it, and taking back only wins a king".
  if (/wins a king|king on [a-h][1-8] can take it, and taking back|by the king on [a-h][1-8] — defending it/.test(t)) flag('story: the king treated as a cheaper attacker', r, t.match(/[^.]*king[^.]*\./)?.[0]);
  // Reported: "you’ve given a bishop and a pawn for a rook" — a trade you came out ahead on.
  for (const m of t.matchAll(/you’ve given ([^.:;—‖]+?) for ([^.:;—‖,]+)/g)) {
    if (listValue(m[1]) && listValue(m[1]) < listValue(m[2])) flag('story: a favourable trade worded as a loss', r, m[0]);
  }
  for (const m of t.matchAll(/you’ve won ([^.:;—‖]+?) for ([^.:;—‖,]+)/g)) {
    if (listValue(m[2]) && listValue(m[1]) <= listValue(m[2])) flag('story: an unfavourable trade worded as a win', r, m[0]);
  }
  // Reported: "White threatens Nxd4, taking your pawn on d4, winning a piece" — the piece came
  // from deep in a what-if line. A pawn capture can only "win" more with a tactic that is named.
  const big = t.match(/threatens [^.‖]*?taking your pawn on [a-h][1-8][^.‖]*?winning (a piece|a knight|a bishop|a rook|the exchange|a rook’s worth of material|about a queen’s worth of material)/);
  if (big && !/fork|pinning|skewer|uncovering|discovered|and then/.test(big[0])) flag('story: a pawn capture said to win a piece with no tactic named', r, big[0]);
  // Reported: "skewers the queen: once it moves, the pawn on b6 falls" — the pawn was defended.
  for (const m of t.matchAll(/(\S+) skewers the \w+: once it moves, the \w+ on ([a-h][1-8]) falls/g)) {
    const san = m[1].replace(/^\d+\.(?:\.\.)?|^…/, '');
    const real = positions.some((f) => {
      const [st] = (() => { try { const g = new Chess(f); const mv = g.move(san, { strict: false }); return mv ? [{ to: mv.to, color: mv.color, fenAfter: g.fen() }] : []; } catch { return []; } })();
      if (!st) return false;
      const B = boardOf(st.fenAfter);
      const front = between(st.to, m[2]).find((q) => B.has(q));
      if (!front) return false;
      B.delete(front);
      return (see(B, m[2], st.color, st.to) ?? 0) > 0;
    });
    if (!real) flag('story: a skewer whose back piece cannot actually be won', r, m[0]);
  }
  // Reported: "It doesn’t lose material…" for 6.Nxd5, which loses a knight for a pawn.
  if (/doesn’t lose material/.test(t)) {
    const lines = [];
    if (r.type === 'mistake' && r.movePv) lines.push([r.fen, r.movePv, r.bestPv]);
    const p = r.type === 'callout' && [...(r.ctx?.last || [])].reverse().find((x) => x.by === 'user' && x.movePv);
    if (p) lines.push([p.fenBefore, p.movePv, p.bestPv]);
    for (const [fen, pv, bestPv] of lines) {
      const at = (line) => { const { U, end } = settle(fen, line); return U.steps.length ? U.mats[Math.max(0, end)] : 0; };
      const mine = at(pv), best = bestPv?.length ? at(bestPv) : 0;
      if (mine <= -1 && mine < best) flag('story: "doesn’t lose material" but the line does', r, `settles at ${mine} (best line ${best})`);
    }
  }
  // Reported: "It pays off a few moves later … you’ve won a piece in all" at an evaluation of +0.1.
  if (r.type === 'plan' && r.score?.type === 'cp' && r.score.value < 60 && materialBalance(r.fen, turnOf(r.fen)) >= 0
    && /(?:wins|you’ve won) (?:a piece|a rook’s worth|about a queen’s worth|the (?:knight|bishop|rook|queen) on [a-h][1-8])(?! for)/.test(r.text || '')) {
    flag('story: a plan claims to win a piece but the engine calls the game level', r, `score ${r.score.value}`);
  }
}

const counts = {};
// A callout or note can refer back to a move just taken back, so recent records' positions count too.
const recent = {};
for (const r of records) {
  counts[r.type] = (counts[r.type] || 0) + 1;
  if (['stall', 'error', 'rejected'].includes(r.type)) { flag(`harness: ${r.type}`, r, JSON.stringify(r.state || r.error || r.uci).slice(0, 300)); continue; }
  if (!['feed', 'callout', 'hint', 'plan', 'mistake', 'threat'].includes(r.type)) continue;
  const own = contextPositions(r);
  const positions = [...new Set([...own, ...(recent[r.gameId] || []).flat()])];
  recent[r.gameId] = [...(recent[r.gameId] || []).slice(-3), own];
  hygiene(r);
  // Opening names and course text are curated (and validated by scripts/validate-courses.mjs).
  const curated = r.type === 'feed' && ['opening', 'book', 'repertoire'].includes(r.tone);
  if (positions.length && !curated) { moveReferences(r, positions); pieceClaims(r, positions); }
  hintLadder(r);
  threatClaims(r);
  planClaims(r);
  mistakeClaims(r);
  gradeConsistency(r);
  threatAudience(r);
  storyClaims(r, positions);
}

const byCheck = {};
for (const i of issues) (byCheck[i.check] ||= []).push(i);
writeFileSync('audit/out/report.json', JSON.stringify({ counts, byCheck }, null, 1));
console.log('records:', counts);
console.log(`\n${issues.length} issue(s):`);
for (const [k, v] of Object.entries(byCheck).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n■ ${k} — ${v.length}`);
  for (const i of v.slice(0, 4)) console.log(`   [${i.type} ${i.gameId}@${i.ply}] ${i.detail ? `«${i.detail}» ` : ''}${i.text.slice(0, 220)}`);
}
