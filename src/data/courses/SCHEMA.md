# Opening course format

Each course is one ES module in this folder: `export default { ... }`.
The app turns every line into a move tree keyed by position, so lines that
share a prefix (or transpose) merge automatically.

```js
export default {
  id: 'italian',                 // kebab-case, unique, matches the filename
  name: 'Italian Game',
  side: 'white',                 // the side the LEARNER plays: 'white' | 'black'
  level: 'Beginner → Intermediate',
  tagline: 'One sentence: what this opening is about.',
  overview: 'Two to four short paragraphs separated by \n\n. Why play it, what kind of positions it leads to, what the learner must understand.',
  keyIdeas: [                    // 3–6 strategic ideas that recur across lines
    'Aim the c4 bishop at f7 — the weakest square in Black\'s camp before castling.',
  ],
  lines: [
    {
      id: 'pianissimo-main',     // unique within the course
      group: 'Main line: 3...Bc5', // chapter heading in the UI (lines are shown grouped, in file order)
      name: 'Giuoco Pianissimo, 6...O-O',
      weight: 10,                // how often the OPPONENT should steer into this line (relative, 1–10)
      trap: false,               // true if the line shows an opponent mistake being punished
      moves: [                   // SAN from the starting position; the LAST move must be the learner's
        ['e4', 'Note for this move.'],
        'e5',                    // a bare string = no note
        ['Nf3', 'Develop with tempo: the knight hits e5.'],
        // ...
      ],
      summary: 'One or two sentences: what to remember / the plan from the final position.',
    },
  ],
};
```

## Rules (enforced by `node scripts/validate-courses.mjs`)

1. Every move is legal, strict SAN (`Nbd2` not `N1d2` unless needed, `O-O`, `exd5`, `e8=Q`). Check/mate signs optional.
2. **One repertoire move per position.** Wherever it is the learner's turn, every line passing through that position must play the same move. (Different opponent replies are what create branches.)
3. Each line ends with the learner's move.
4. Line ids are unique; course id matches the filename.

## Quality bar (checked with `--engine`)

- Learner moves must be sound: the validator flags any learner move that loses more than ~0.6 pawns versus Stockfish's best at depth 14. Fix or justify (gambits are fine only if the course is explicitly a gambit course).
- Opponent moves outside `trap: true` lines should be mainstream (popular at club level). In trap lines, the opponent's mistake should be a natural, commonly played error, and the punishment must actually work.

## Writing the notes (this is the teaching — take it seriously)

- Most learner moves get a note; key opponent moves get one too ("Black threatens ...Bxf2+", "the main alternative").
- Be concrete: name squares, pieces, pawn breaks, and plans. "Prepares d4, which opens the c1–h6 diagonal" beats "a good developing move".
- Explain *why*, and what would go wrong otherwise. Mention the typical mistake at that moment when there is one.
- Notes are ≤ 220 characters. Plain text, no markdown. Use `...` before Black moves in prose (`...d5`), and move numbers sparingly.
- Aim for club players (roughly 800–1800). Prefer the lines they will actually meet over deep grandmaster theory.

---

# Opponent book format (`src/data/book.js`)

The opponent (computer) uses this book to play realistic, *recognisable* openings for its persona,
then hands over to the engine. Lines are matched by position, so transpositions work.

```js
export default {
  lines: [
    {
      id: 'ruy-closed',
      name: 'Ruy Lopez, Closed',
      tags: ['e4', 'e5', 'ruy', 'main'],
      weight: 10,   // real-world popularity at club level, 1–10
      moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
    },
  ],
};
```

Tag vocabulary (use only these, several per line):

- White first move: `e4` `d4` `c4` `nf3` `flank`
- Black defence vs 1.e4: `e5` `sicilian` `french` `caro` `scandi` `pirc` `alekhine` `modern`
- Black defence vs 1.d4/1.c4: `d5` `qgd` `qga` `slav` `kid` `nimzo` `qid` `grunfeld` `benoni` `dutch` `budapest`
- White system: `italian` `ruy` `scotch` `vienna` `kings-gambit` `evans` `danish` `fried-liver` `open-sicilian` `alapin` `smith-morra` `closed-sicilian` `advance` `exchange` `london` `qg` `catalan` `colle` `trompowsky` `english` `reti`
- Character: `main` (mainstream theory), `solid`, `sharp`, `gambit`, `offbeat`

Lines are 8–16 plies long and end wherever ordinary middlegame play begins.
