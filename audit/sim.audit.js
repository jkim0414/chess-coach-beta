// Coaching audit, part 1: play complete games through the real GameController with a
// simulated learner, and record everything the coach says, with the exact context
// (position, engine lines) needed to fact-check it afterwards.
//
//   SHARD=0 GAMES=6 npx vitest run --config vitest.audit.config.js
//
// Output: audit/out/shard-<SHARD>.json
import { it } from 'vitest';
import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GameController } from '../src/play/controller.js';
import { createNodeEngine } from '../test/nodeWorker.js';
import * as store from '../src/lib/store.js';
import { planOf, describePlan, planHints } from '../src/lib/plan.js';
import { explainMistake, explainConsequence, explainThreat } from '../src/lib/explain.js';
import { confirmThreat } from '../src/play/controller.js';
import { winOf } from '../src/lib/evaluation.js';
import { nullMoveFen, moveToUci, uciToSan } from '../src/lib/chessutil.js';

const SHARD = Number(process.env.SHARD || 0);
const GAMES = Number(process.env.GAMES || 4);
const MAX_PLIES = Number(process.env.MAX_PLIES || 70);
const PERSONAS = ['classicist', 'strategist', 'attacker', 'grinder', 'sparring'];
const MODES = ['coach', 'guided', 'exam'];

function seeded(seed) {
  let x = seed * 9301 + 49297;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(pred, ms = 60000) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) return false;
    await sleep(20);
  }
  return true;
}

it(`audit shard ${SHARD}`, async () => {
  const engine = createNodeEngine(); // the controller's
  const probe = createNodeEngine(); // our own probes and the learner's move choice
  const records = [];
  const rec = (r) => records.push({ shard: SHARD, ...r });

  for (let gi = 0; gi < GAMES; gi++) {
    const seed = SHARD * 1000 + gi;
    const rng = seeded(seed);
    store.__setState(store.freshState());
    // Learn a couple of opening lines so repertoire coaching shows up too.
    const persona = PERSONAS[(SHARD + gi) % PERSONAS.length];
    const coachMode = MODES[(SHARD * 2 + gi) % MODES.length];
    const userColor = (SHARD + gi) % 2 ? 'black' : 'white';
    const elo = [900, 1200, 1500, 1800][(SHARD + gi * 3) % 4];
    const learnerSkill = [0.55, 0.7, 0.85][(gi + SHARD) % 3]; // chance of playing the engine's best
    store.setCourseActive(userColor === 'white' ? 'italian' : 'caro-kann', true);

    const c = new GameController({ engine, oppDelay: 0, rng });
    const gameId = `s${SHARD}g${gi}`;
    const seenFeed = new Set();
    let lastCallout = '';
    const unsub = c.subscribe(() => {
      const s = c.getState();
      for (const f of s.feed) {
        if (seenFeed.has(f.id)) continue;
        seenFeed.add(f.id);
        rec({ type: 'feed', gameId, ply: s.plies.length, tone: f.tone, title: f.title, text: f.text, reveal: f.reveal || null, ctx: ctxOf(s, c.t) });
      }
      const a = s.active;
      const key = a ? JSON.stringify([a.kind, a.state, a.mode, a.title, a.why, a.refutation, a.hintText, a.retryNote, a.text, a.threat?.text]) : '';
      if (key && key !== lastCallout) {
        lastCallout = key;
        rec({ type: 'callout', gameId, ply: s.plies.length, kind: a.kind, state: a.state || a.mode || null, reason: a.reason || null, shown: shownText(a), ctx: ctxOf(s, c.t) });
      }
    });

    c.start({ personaId: persona, elo, userColor, coachMode, threatPrompts: true });
    rec({ type: 'game', gameId, persona, coachMode, userColor, elo, learnerSkill });

    let guard = 0;
    while (c.getState().status === 'playing' && c.getState().plies.length < MAX_PLIES && guard++ < 400) {
      const ok = await waitUntil(() => actionable(c.getState()) || c.getState().status !== 'playing', 90000);
      if (!ok) { rec({ type: 'stall', gameId, state: summary(c.getState()) }); break; }
      const s = c.getState();
      if (s.status !== 'playing') break;
      const a = s.active;

      if (a?.kind === 'threat' && a.state === 'asking') {
        const right = rng() < 0.6;
        c.answerThreat(right ? a.threat.squares[0] : rng() < 0.5 ? null : 'a1');
        continue;
      }
      if (a?.kind === 'intervention' && a.mode === 'decide') {
        const r = rng();
        if (r < 0.5) c.retry(); else if (r < 0.75) await c.showMe(); else c.playOn();
        await sleep(10);
        continue;
      }
      if (a?.kind === 'drill') {
        const step = a.L.steps[a.idx];
        const uci = rng() < 0.85 && step ? step.uci : await learnerMove(probe, s.fen, rng, learnerSkill);
        if (uci) c.userMove(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
        await sleep(10);
        continue;
      }

      // An ordinary turn (or a retry after an intervention).
      const t = c.t;
      if (t?.result?.lines?.length && !(a?.kind === 'intervention')) await probeTurn(probe, t, gameId, s, rec, rng);
      if (rng() < 0.25 && t?.result) {
        for (let k = 0; k < 3; k++) {
          await c.hint();
          const h = c.getState().active;
          rec({ type: 'hint', gameId, ply: s.plies.length, level: h?.hintLevel ?? null, text: h?.hintText ?? null, fen: t.fen, bestPv: t.result?.lines?.[0]?.pv || null, inIntervention: a?.kind === 'intervention' ? a.reason : null, arrows: c.getState().arrows, marks: c.getState().marks });
        }
      }
      let uci;
      if (a?.kind === 'intervention' && a.mode === 'retry') {
        uci = rng() < 0.6 ? t.result?.lines?.[0]?.pv?.[0] : await learnerMove(probe, s.fen, rng, learnerSkill);
      } else {
        uci = await learnerMove(probe, s.fen, rng, learnerSkill);
      }
      if (!uci) break;
      const accepted = c.userMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || 'q');
      if (!accepted) { rec({ type: 'rejected', gameId, fen: s.fen, uci, state: summary(s) }); await sleep(50); }
      await sleep(10);
    }
    unsub();
    rec({ type: 'end', gameId, plies: c.getState().plies.length, status: c.getState().status, result: c.getState().result, summary: c.getState().summary });
    c.stop();
  }

  mkdirSync('audit/out', { recursive: true });
  writeFileSync(`audit/out/shard-${SHARD}.json`, JSON.stringify(records, null, 1));
  engine.terminate();
  probe.terminate();
}, 60 * 60 * 1000);

function actionable(s) {
  if (s.status !== 'playing' || s.turn !== 'user' || s.locked || s.grading || s.hintPending) return false;
  const a = s.active;
  if (a?.kind === 'threat' && a.state === 'asking') return true;
  if (a?.kind === 'intervention') return true;
  if (a?.kind === 'drill') return true;
  return !!s.analysisReady;
}

function summary(s) {
  return { status: s.status, turn: s.turn, locked: s.locked, grading: s.grading, active: s.active?.kind, plies: s.plies.length, analysisReady: s.analysisReady };
}

/** Exactly the strings the coach panel renders for this callout (see CoachPanel.jsx). */
function shownText(a) {
  if (a.kind === 'threat') return a.state === 'asking' ? [] : [a.threat?.text, a.threat?.recapture];
  if (a.kind === 'moment') return [a.type !== 'hint' && a.title, a.text, a.hintText];
  if (a.kind === 'intervention') return a.mode === 'decide' ? [a.title, a.why, a.refutation, a.retryNote, a.hintText] : [a.title, a.retryNote, a.hintText];
  if (a.kind === 'drill') return [a.text];
  return [];
}

const ucis = (steps) => steps?.map((x) => x.uci) || null;
function ctxOf(s, t) {
  const last = s.plies.slice(-3).map((p) => ({ san: p.san, uci: p.uci, by: p.by, fenBefore: p.fenBefore, fenAfter: p.fenAfter, grade: p.grade || null, bestPv: p.bestPv || null, movePv: p.movePv || null }));
  // The controller's own lines for the current turn, so messages built from them can be checked.
  const turn = t ? {
    fen: t.fen,
    lines: t.result?.lines?.slice(0, 3).map((l) => l.pv) || [],
    planPv: ucis(t.plan?.steps), planThreatPv: ucis(t.plan?.threat?.steps),
    threatPv: ucis(t.threat?.L?.steps), oppThreatPv: ucis(t.plan?.oppThreat?.L?.steps),
  } : null;
  return { fen: s.fen, userColor: s.userColor, last, turn };
}

/** A learner of a given skill: usually a top engine move, sometimes a weaker one, now and then a blunder. */
async function learnerMove(probe, fen, rng, skill) {
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true });
  if (!legal.length) return null;
  const r = rng();
  if (r > 0.97) return moveToUci(legal[Math.floor(rng() * legal.length)]);
  const res = await probe.analyze(fen, { depth: 9, multipv: 4, movetime: 1500 });
  const lines = res?.lines || [];
  if (!lines.length) return moveToUci(legal[0]);
  if (r < skill) return lines[0].pv[0];
  if (r < skill + 0.25) return lines[Math.min(lines.length - 1, 1 + Math.floor(rng() * 3))].pv[0];
  // a "natural" human move: a capture or check if available
  const natural = legal.filter((m) => m.captured || m.san.includes('+'));
  const pick = natural.length ? natural[Math.floor(rng() * natural.length)] : legal[Math.floor(rng() * legal.length)];
  return moveToUci(pick);
}

/** Probe the explanation library directly at this position, with full context for checking. */
async function probeTurn(probe, t, gameId, s, rec, rng) {
  const fen = t.fen;
  const lines = t.result.lines;
  const best = lines[0];
  try {
    const plan = await planOf(probe, fen, best.pv, { opponentThreat: true });
    plan.win = winOf(best.score);
    rec({
      type: 'plan', gameId, ply: s.plies.length, fen, pv: best.pv, score: best.score,
      text: describePlan(plan), hints: planHints(plan).map((h) => ({ text: h.text, marks: h.marks, arrows: h.arrows })),
      threatPv: plan.threat ? plan.threat.steps.map((x) => x.uci) : null, threatSide: plan.threat?.side || null,
      oppThreatPv: plan.oppThreat?.L ? plan.oppThreat.L.steps.map((x) => x.uci) : null,
      oppThreat: plan.oppThreat ? { text: plan.oppThreat.text, move: plan.oppThreat.move ? { from: plan.oppThreat.move.from, to: plan.oppThreat.move.to, san: plan.oppThreat.move.san } : null } : null,
    });
    // A non-best move, explained as a mistake (whether or not it is one).
    const alt = lines[1]?.pv[0] || null;
    const cands = [alt].filter(Boolean);
    const g = new Chess(fen);
    const legal = g.moves({ verbose: true });
    if (legal.length) cands.push(moveToUci(legal[Math.floor(rng() * legal.length)]));
    for (const uci of cands) {
      const m = await probe.analyze(fen, { depth: 14, searchmoves: [uci], movetime: 3000 });
      if (!m?.lines[0]) continue;
      const args = { fen, uci, movePv: m.lines[0].pv, winBefore: winOf(best.score), winAfter: winOf(m.lines[0].score) };
      rec({
        type: 'mistake', gameId, ply: s.plies.length, fen, uci, san: uciToSan(fen, uci), movePv: m.lines[0].pv, score: m.lines[0].score, bestScore: best.score,
        lossWin: +(args.winBefore - args.winAfter).toFixed(3),
        why: explainMistake(args).why, refutation: explainMistake(args).refutation,
        consequence: explainConsequence({ fen, movePv: m.lines[0].pv, winAfter: args.winAfter })?.text || null,
      });
    }
    const nf = nullMoveFen(fen);
    if (nf) {
      const tr = await probe.analyze(nf, { depth: 10, movetime: 800 });
      const raw = tr?.lines[0] ? explainThreat(fen, tr.lines[0].pv) : null;
      const confirmed = raw && (await confirmThreat(probe, fen, raw));
      const th = confirmed || raw, real = !!confirmed;
      if (th) rec({ type: 'threat', gameId, ply: s.plies.length, fen, nullPv: tr.lines[0].pv, text: [th.text, th.recapture].filter(Boolean).join(' '), real, squares: th.squares, move: { from: th.move.from, to: th.move.to, san: th.move.san }, gain: th.gain, mate: th.mate });
    }
  } catch (e) {
    rec({ type: 'error', gameId, ply: s.plies.length, fen, error: String(e?.stack || e) });
  }
}
