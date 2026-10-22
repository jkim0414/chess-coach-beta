# Chess Coach

A chess trainer built around one idea: **lessons stick when they happen inside your own games.**
Most training apps teach patterns in isolation and drill them out of context. Chess Coach puts the
teaching where transfer has to happen — in real games against opponents with a recognisable style —
and then turns your own moments into spaced-repetition practice.

Live: https://chess-coach-beta.vercel.app

## What it does

**Play** — games against configurable opponents, with a coach beside you.

- **Opponents with a style.** The Classicist (1.e4/1…e5), the Strategist (Queen's Gambit, slow squeezes),
  the Attacker (gambits and king hunts), the Grinder (London, Caro-Kann, trades), Repertoire Sparring
  (steers into the openings you're studying, favouring lines due for review), or a custom mix of style
  and openings, at 600–2400 strength. Stockfish has no style settings, so the opponent asks for several
  candidate moves and picks among the near-equal ones with a style score and human-like variance;
  weaker settings also make human-looking blunders.
- **Threat check.** When your opponent creates a real threat, the coach asks *"what is Black threatening?"*
  before you can move — the single most important habit at club level. The prompts fade as your streak grows.
- **Interventions.** Blunders, mistakes and missed tactics stop the game: you see *why* your move fails
  (never the answer), then **try again** with a hint ladder (theme → piece → move), see the answer, or keep
  your move. In Coach mode tactics are not announced — noticing them is the skill — but missing one is.
- **Play it out.** When you find (or are shown) a combination, you play it through to the end against the
  best defence before the game continues.
- **Your repertoire, live.** Positions from your active opening courses are checked during games; deviating
  from your prep is a failed recall, and the opponent leaving your prep is flagged.
- **Three coaching modes.** Guided (critical moments announced), Coach (default), Exam (silent; full review after).

**Openings** — six courses (Italian, London, 1.e4 Toolkit, Caro-Kann, 1…e5, QGD) with ~210 lines and
~1,100 positions to know, every move annotated with *why*. Learn a line (watch-and-play with notes, then
an immediate recall pass), then review it on a schedule. Reviews replay the whole line from move one and
quiz only the moves that are due, so moves are always recalled in context.

**Review** — one FSRS spaced-repetition queue for opening positions, positions from your own games
(mistakes and tactics), and missed puzzles, interleaved. Grades come from what you actually do on the board
(right/wrong, hints, time), never from self-rating. Alternative correct answers are verified by the engine.

**Pattern practice** — real-game puzzles from the Lichess database by theme, offered right after you meet
(or miss) that pattern in a game. Missed puzzles join your review deck.

**Progress** — accuracy trend, which tactical patterns you find vs miss in real games, threat-spotting rate,
where your mistakes happen (opening/middlegame/endgame), repertoire mastery, and a full review of every game.

## How it works

| Piece | Where |
|---|---|
| Stockfish 18 (lite, WASM) in a Web Worker, behind a strict job queue (no stale `bestmove` races) | `src/lib/engine.js` |
| Turn-independent attack maps, static exchange evaluation, motif detection (forks, pins, skewers, discovered attacks, mates) | `src/lib/tactics.js` |
| The coach's explanations, built from those board facts and engine lines | `src/lib/explain.js` |
| Live game flow: threat checks, critical moments, grading, interventions, drills | `src/play/controller.js` |
| Opponent personas, style scoring, strength model, opening book | `src/lib/opponent.js`, `src/data/book.js` |
| FSRS-4.5 scheduler and auto-grading | `src/lib/fsrs.js` |
| Opening courses → position-keyed trees, repertoire lookups | `src/lib/courses.js`, `src/data/courses/` |
| Persistence (localStorage, export/import, resume an unfinished game) | `src/lib/store.js` |

Everything runs in the browser. Progress is stored locally — use **Progress → Export backup** to move it.
The only network call is to the public Lichess puzzle API for pattern practice.

## Development

```bash
npm install
npm run dev                      # vite dev server
npm test                         # unit + end-to-end tests (runs real Stockfish under Node)
npm run lint
npm run validate:content         # legality + one-move-per-position checks for courses and book
npm run validate:content:engine  # …plus Stockfish soundness checks on every repertoire move
npm run build
```

Node 18+. To add or edit a course, follow `src/data/courses/SCHEMA.md` and run the validator.

## Deployment

Static build (`dist/`) on Vercel; `vercel.json` sets the build and a COOP header. Routing is hash-based,
so no rewrites are needed. `server.js` (Express) is kept for the older Railway deploy.
