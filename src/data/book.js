// Opponent opening book. The computer picks book moves for ITS side from lines whose
// tags suit its persona, then hands over to the engine. Lines are matched by position,
// so transpositions merge. Format and tag vocabulary: src/data/courses/SCHEMA.md.
// Weights = rough real-world popularity at club level (1–10).

export default {
  lines: [
    // ── 1.e4 e5 · Italian Game ────────────────────────────────────────────────
    { id: 'italian-pianissimo', name: 'Italian Game, Giuoco Pianissimo', tags: ['e4', 'e5', 'italian', 'main', 'solid'], weight: 10, moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 O-O Re1 Ba7' },
    { id: 'italian-pianissimo-4d3', name: 'Italian Game, Giuoco Pianissimo (4.d3)', tags: ['e4', 'e5', 'italian', 'main', 'solid'], weight: 7, moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 O-O Re1 a6 Bb3 Ba7' },
    { id: 'italian-giuoco-piano-d4', name: 'Italian Game, Giuoco Piano Main Line', tags: ['e4', 'e5', 'italian', 'main', 'sharp'], weight: 5, moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5' },
    { id: 'two-knights-d3-be7', name: 'Two Knights Defence, 4.d3 Be7', tags: ['e4', 'e5', 'italian', 'main', 'solid'], weight: 6, moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6' },
    { id: 'two-knights-d3-bc5', name: 'Two Knights Defence, 4.d3 Bc5', tags: ['e4', 'e5', 'italian', 'main', 'solid'], weight: 6, moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Bb3 a6 Nbd2 Ba7' },
    { id: 'two-knights-ng5', name: 'Two Knights Defence, 4.Ng5 Main Line', tags: ['e4', 'e5', 'italian', 'fried-liver', 'sharp', 'gambit'], weight: 5, moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6' },
    { id: 'evans-accepted', name: 'Evans Gambit Accepted', tags: ['e4', 'e5', 'italian', 'evans', 'gambit', 'sharp'], weight: 3, moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5' },
    { id: 'evans-declined', name: 'Evans Gambit Declined', tags: ['e4', 'e5', 'italian', 'evans', 'gambit', 'solid'], weight: 2, moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6 Nd5 Nxd5 exd5 Nd4' },

    // ── 1.e4 e5 · Ruy Lopez ──────────────────────────────────────────────────
    { id: 'ruy-closed', name: 'Ruy Lopez, Closed', tags: ['e4', 'e5', 'ruy', 'main'], weight: 10, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O' },
    { id: 'ruy-anti-marshall', name: 'Ruy Lopez, Anti-Marshall 8.h3', tags: ['e4', 'e5', 'ruy', 'main', 'solid'], weight: 5, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 Bb7' },
    { id: 'ruy-marshall', name: 'Ruy Lopez, Marshall Attack', tags: ['e4', 'e5', 'ruy', 'main', 'sharp', 'gambit'], weight: 4, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5' },
    { id: 'ruy-berlin-endgame', name: 'Ruy Lopez, Berlin Defence', tags: ['e4', 'e5', 'ruy', 'main', 'solid'], weight: 5, moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8' },
    { id: 'ruy-berlin-d3', name: 'Ruy Lopez, Berlin Defence, 4.d3', tags: ['e4', 'e5', 'ruy', 'main', 'solid'], weight: 6, moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 h3 a6 Ba4 Ba7' },
    { id: 'ruy-open', name: 'Ruy Lopez, Open Variation', tags: ['e4', 'e5', 'ruy', 'main', 'sharp'], weight: 3, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6' },
    { id: 'ruy-exchange', name: 'Ruy Lopez, Exchange Variation', tags: ['e4', 'e5', 'ruy', 'exchange', 'solid'], weight: 5, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1' },
    { id: 'ruy-steinitz-deferred', name: 'Ruy Lopez, Modern Steinitz Defence', tags: ['e4', 'e5', 'ruy', 'solid'], weight: 2, moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7 d4 Nf6 O-O Be7' },
    { id: 'ruy-classical', name: 'Ruy Lopez, Classical Defence', tags: ['e4', 'e5', 'ruy', 'main'], weight: 2, moves: 'e4 e5 Nf3 Nc6 Bb5 Bc5 O-O Nd4 Nxd4 Bxd4 c3 Bb6 d4 c6 Ba4 d6' },
    { id: 'ruy-schliemann', name: 'Ruy Lopez, Schliemann Defence', tags: ['e4', 'e5', 'ruy', 'sharp', 'gambit'], weight: 2, moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4 Nf6 O-O d6 Nc3 Be7' },

    // ── 1.e4 e5 · Scotch, Petrov, Philidor, Four Knights ─────────────────────
    { id: 'scotch-mieses', name: 'Scotch Game, Mieses Variation', tags: ['e4', 'e5', 'scotch', 'main'], weight: 5, moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6' },
    { id: 'scotch-classical', name: 'Scotch Game, Classical Variation', tags: ['e4', 'e5', 'scotch', 'main'], weight: 4, moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nxc6 Qf6 Qd2 dxc6 Nc3 Be6' },
    { id: 'scotch-gambit', name: 'Scotch Gambit', tags: ['e4', 'e5', 'scotch', 'gambit', 'sharp'], weight: 2, moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6' },
    { id: 'petrov-classical', name: "Petrov's Defence, Classical Attack", tags: ['e4', 'e5', 'main', 'solid'], weight: 4, moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4' },
    { id: 'petrov-nc3', name: "Petrov's Defence, 5.Nc3", tags: ['e4', 'e5', 'main', 'sharp'], weight: 4, moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6' },
    { id: 'philidor-exchange', name: 'Philidor Defence, Exchange Variation', tags: ['e4', 'e5', 'main', 'solid'], weight: 3, moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8' },
    { id: 'philidor-lion', name: 'Philidor Defence, Hanham (Lion) Setup', tags: ['e4', 'e5', 'pirc', 'solid'], weight: 2, moves: 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 b6' },
    { id: 'four-knights-scotch', name: 'Four Knights Game, Scotch Variation', tags: ['e4', 'e5', 'main', 'solid'], weight: 4, moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5' },
    { id: 'four-knights-spanish', name: 'Four Knights Game, Spanish Variation', tags: ['e4', 'e5', 'main', 'solid'], weight: 3, moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7' },
    { id: 'four-knights-italian', name: 'Four Knights Game, Italian (fork trick)', tags: ['e4', 'e5', 'italian', 'main'], weight: 2, moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6' },

    // ── 1.e4 e5 · Vienna, Bishop's, Centre Game, Danish, King's Gambit ───────
    { id: 'vienna-gambit', name: 'Vienna Gambit, 3...d5', tags: ['e4', 'e5', 'vienna', 'sharp', 'gambit'], weight: 3, moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5' },
    { id: 'vienna-bc4', name: 'Vienna Game, 3.Bc4', tags: ['e4', 'e5', 'vienna', 'main'], weight: 3, moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bb4 Nf3 d5 exd5 Nxd5 O-O Bxc3 bxc3 O-O' },
    { id: 'bishops-opening', name: "Bishop's Opening", tags: ['e4', 'e5', 'italian', 'solid'], weight: 2, moves: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 Be6 O-O Nbd7' },
    { id: 'centre-game', name: 'Centre Game', tags: ['e4', 'e5', 'offbeat'], weight: 1, moves: 'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O O-O-O Re8' },
    { id: 'parham', name: 'Parham Attack (2.Qh5)', tags: ['e4', 'e5', 'offbeat'], weight: 1, moves: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Ne2 Bg7 Nbc3 d6' },
    { id: 'scholars-attempt', name: "Bishop's Opening, Scholar's Mate attempt", tags: ['e4', 'e5', 'offbeat'], weight: 1, moves: 'e4 e5 Bc4 Nc6 Qh5 g6 Qf3 Nf6 Ne2 Bg7 Nbc3 d6' },
    { id: 'danish-accepted', name: 'Danish Gambit Accepted', tags: ['e4', 'e5', 'danish', 'gambit', 'sharp'], weight: 2, moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6' },
    { id: 'danish-declined', name: 'Danish Gambit Declined', tags: ['e4', 'e5', 'danish', 'gambit', 'solid'], weight: 2, moves: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+' },
    { id: 'kga-modern', name: "King's Gambit Accepted, Modern Defence", tags: ['e4', 'e5', 'kings-gambit', 'gambit', 'sharp'], weight: 3, moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bb5+ c6 dxc6 Nxc6 d4 Bd6 O-O O-O' },
    { id: 'kga-kieseritzky', name: "King's Gambit Accepted, Kieseritzky", tags: ['e4', 'e5', 'kings-gambit', 'gambit', 'sharp'], weight: 2, moves: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6' },
    { id: 'kga-fischer', name: "King's Gambit Accepted, Fischer Defence", tags: ['e4', 'e5', 'kings-gambit', 'gambit', 'sharp'], weight: 2, moves: 'e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1 Bh6 Nc3 c6' },
    { id: 'kgd-classical', name: "King's Gambit Declined, Classical", tags: ['e4', 'e5', 'kings-gambit', 'gambit', 'solid'], weight: 2, moves: 'e4 e5 f4 Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 O-O' },
    { id: 'kgd-falkbeer', name: "King's Gambit, Falkbeer / Modern Countergambit", tags: ['e4', 'e5', 'kings-gambit', 'gambit', 'sharp'], weight: 2, moves: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6 Bc4 Nxd5 O-O Be7' },

    // ── 1.e4 c5 · Open Sicilian ──────────────────────────────────────────────
    { id: 'najdorf-english-attack', name: 'Sicilian Najdorf, English Attack', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 9, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7' },
    { id: 'najdorf-bg5', name: 'Sicilian Najdorf, 6.Bg5', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 5, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7' },
    { id: 'najdorf-be2', name: 'Sicilian Najdorf, Opočenský 6.Be2', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'solid'], weight: 5, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O' },
    { id: 'dragon-yugoslav', name: 'Sicilian Dragon, Yugoslav Attack', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 6, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6' },
    { id: 'dragon-classical', name: 'Sicilian Dragon, Classical', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'solid'], weight: 3, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6' },
    { id: 'scheveningen-classical', name: 'Sicilian Scheveningen, Classical', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'solid'], weight: 3, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 Be7 O-O O-O f4 Nc6' },
    { id: 'scheveningen-keres', name: 'Sicilian Scheveningen, Keres Attack', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 3, moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 g4 h6 h4 Nc6 Rg1 h5' },
    { id: 'richter-rauzer', name: 'Sicilian Classical, Richter-Rauzer', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 4, moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6 Qd2 a6 O-O-O Bd7' },
    { id: 'sveshnikov', name: 'Sicilian Sveshnikov', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 5, moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5' },
    { id: 'taimanov-english', name: 'Sicilian Taimanov, English Attack', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 4, moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Qd2 Nf6 O-O-O Bb4' },
    { id: 'kan', name: 'Sicilian Kan (Paulsen)', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'solid'], weight: 3, moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7 Qe2 d6 c4 g6' },
    { id: 'accelerated-dragon-maroczy', name: 'Accelerated Dragon, Maróczy Bind', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'solid'], weight: 3, moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6' },
    { id: 'accelerated-dragon-nc3', name: 'Accelerated Dragon, 5.Nc3', tags: ['e4', 'sicilian', 'open-sicilian', 'main', 'sharp'], weight: 3, moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Bc4 O-O Bb3 d6' },

    // ── 1.e4 c5 · Anti-Sicilians ─────────────────────────────────────────────
    { id: 'sicilian-moscow', name: 'Sicilian, Moscow Variation 3.Bb5+', tags: ['e4', 'sicilian', 'main', 'solid'], weight: 4, moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 c4 Nc6 Nc3 g6 d4 cxd4 Nxd4 Bg7' },
    { id: 'rossolimo-g6', name: 'Sicilian, Rossolimo 3...g6', tags: ['e4', 'sicilian', 'main'], weight: 4, moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 Bxc6 dxc6 d3 Qc7' },
    { id: 'rossolimo-e6', name: 'Sicilian, Rossolimo 3...e6', tags: ['e4', 'sicilian', 'main', 'solid'], weight: 3, moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5' },
    { id: 'alapin-nf6', name: 'Sicilian, Alapin 2...Nf6', tags: ['e4', 'sicilian', 'alapin', 'main', 'solid'], weight: 5, moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5' },
    { id: 'alapin-d5', name: 'Sicilian, Alapin 2...d5', tags: ['e4', 'sicilian', 'alapin', 'main', 'solid'], weight: 5, moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 Nc6 O-O cxd4 cxd4 Be7' },
    { id: 'closed-sicilian', name: 'Closed Sicilian', tags: ['e4', 'sicilian', 'closed-sicilian', 'main', 'solid'], weight: 4, moves: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O' },
    { id: 'grand-prix-bc4', name: 'Sicilian, Grand Prix Attack 5.Bc4', tags: ['e4', 'sicilian', 'closed-sicilian', 'sharp'], weight: 3, moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 d3 O-O' },
    { id: 'grand-prix-bb5', name: 'Sicilian, Grand Prix Attack 5.Bb5', tags: ['e4', 'sicilian', 'closed-sicilian', 'sharp'], weight: 3, moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O a6 Bd3 d6 Nxd4 cxd4' },
    { id: 'smith-morra-accepted', name: 'Smith-Morra Gambit Accepted', tags: ['e4', 'sicilian', 'smith-morra', 'gambit', 'sharp'], weight: 4, moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7' },
    { id: 'smith-morra-declined', name: 'Smith-Morra Gambit Declined', tags: ['e4', 'sicilian', 'smith-morra', 'gambit', 'solid'], weight: 2, moves: 'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5' },

    // ── 1.e4 e6 · French Defence ─────────────────────────────────────────────
    { id: 'french-winawer-qg4', name: 'French Winawer, 7.Qg4', tags: ['e4', 'french', 'main', 'sharp'], weight: 4, moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O Bd3 Nbc6' },
    { id: 'french-winawer-positional', name: 'French Winawer, Positional 7.Nf3', tags: ['e4', 'french', 'main', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Nf3 Nbc6 a4 Qa5' },
    { id: 'french-steinitz', name: 'French Classical, Steinitz 5.f4', tags: ['e4', 'french', 'main', 'sharp'], weight: 4, moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 cxd4 Nxd4 Bc5' },
    { id: 'french-classical-bg5', name: 'French Classical, 4.Bg5', tags: ['e4', 'french', 'main'], weight: 2, moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5' },
    { id: 'french-rubinstein', name: 'French Rubinstein', tags: ['e4', 'french', 'main', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 dxc5 Bxc5' },
    { id: 'french-tarrasch-nf6', name: 'French Tarrasch, 3...Nf6', tags: ['e4', 'french', 'main', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6' },
    { id: 'french-tarrasch-c5', name: 'French Tarrasch, 3...c5', tags: ['e4', 'french', 'main', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O Nf6 Nb3 Nc6' },
    { id: 'french-advance-qb6', name: 'French Advance, 5...Qb6', tags: ['e4', 'french', 'advance', 'main'], weight: 5, moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nh6 Nc3 Nf5' },
    { id: 'french-advance-bd7', name: 'French Advance, 5...Bd7', tags: ['e4', 'french', 'advance', 'main', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 Nge7 Na3 cxd4 cxd4 Nf5' },
    { id: 'french-milner-barry', name: 'French Advance, Milner-Barry Gambit', tags: ['e4', 'french', 'advance', 'gambit', 'sharp'], weight: 2, moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4' },
    { id: 'french-exchange', name: 'French Exchange', tags: ['e4', 'french', 'exchange', 'solid'], weight: 3, moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4 Nbd2 Nbd7' },

    // ── 1.e4 c6 · Caro-Kann Defence ──────────────────────────────────────────
    { id: 'caro-classical', name: 'Caro-Kann, Classical 4...Bf5', tags: ['e4', 'caro', 'main', 'solid'], weight: 6, moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7' },
    { id: 'caro-karpov', name: 'Caro-Kann, Karpov 4...Nd7', tags: ['e4', 'caro', 'main', 'solid'], weight: 4, moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Ng5 Ngf6 Bd3 e6 N1f3 Bd6 Qe2 h6' },
    { id: 'caro-advance-short', name: 'Caro-Kann Advance, Short System', tags: ['e4', 'caro', 'advance', 'main', 'solid'], weight: 5, moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 c3 Nc6' },
    { id: 'caro-advance-bayonet', name: 'Caro-Kann Advance, Bayonet 5.g4', tags: ['e4', 'caro', 'advance', 'sharp'], weight: 3, moves: 'e4 c6 d4 d5 e5 Bf5 Nc3 e6 g4 Bg6 Nge2 c5 h4 h5 Nf4 Bh7' },
    { id: 'caro-exchange', name: 'Caro-Kann, Exchange Variation', tags: ['e4', 'caro', 'exchange', 'solid'], weight: 4, moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6' },
    { id: 'caro-panov', name: 'Caro-Kann, Panov Attack', tags: ['e4', 'caro', 'exchange', 'main'], weight: 4, moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7 cxd5 Nxd5 Bd3 Nc6' },
    { id: 'caro-two-knights', name: 'Caro-Kann, Two Knights', tags: ['e4', 'caro', 'solid'], weight: 3, moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 Nxe4 Nxe4' },
    { id: 'caro-fantasy', name: 'Caro-Kann, Fantasy Variation', tags: ['e4', 'caro', 'sharp', 'offbeat'], weight: 2, moves: 'e4 c6 d4 d5 f3 e6 Nc3 Nf6 Bg5 h6 Bh4 c5' },

    // ── 1.e4 d5 · Scandinavian Defence ───────────────────────────────────────
    { id: 'scandi-qa5', name: 'Scandinavian, Main Line 3...Qa5', tags: ['e4', 'scandi', 'main'], weight: 5, moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6' },
    { id: 'scandi-qa5-sharp', name: 'Scandinavian, 3...Qa5 with Qe2 and O-O-O', tags: ['e4', 'scandi', 'sharp'], weight: 2, moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4' },
    { id: 'scandi-qd6', name: 'Scandinavian, 3...Qd6', tags: ['e4', 'scandi', 'main'], weight: 4, moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O' },
    { id: 'scandi-qd8', name: 'Scandinavian, 3...Qd8', tags: ['e4', 'scandi', 'solid'], weight: 2, moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 c6 Be3 e6' },
    { id: 'scandi-modern', name: 'Scandinavian, Modern 2...Nf6', tags: ['e4', 'scandi', 'main'], weight: 3, moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7 h3 O-O Be3 Nc6' },

    // ── 1.e4 d6 / g6 / Nf6 · Pirc, Modern, Alekhine ──────────────────────────
    { id: 'pirc-austrian', name: 'Pirc, Austrian Attack', tags: ['e4', 'pirc', 'sharp'], weight: 3, moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 dxc5 Qa5 Bd3 Qxc5 Qe2 O-O' },
    { id: 'pirc-classical', name: 'Pirc, Classical', tags: ['e4', 'pirc', 'main', 'solid'], weight: 4, moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 a5 h3 Na6' },
    { id: 'pirc-150', name: 'Pirc, 150 Attack', tags: ['e4', 'pirc', 'main', 'sharp'], weight: 4, moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6' },
    { id: 'modern-main', name: 'Modern Defence', tags: ['e4', 'modern', 'main', 'sharp'], weight: 3, moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nd7 f4 b5 Nf3 Bb7' },
    { id: 'modern-nf3', name: 'Modern Defence, 3.Nf3', tags: ['e4', 'modern', 'solid'], weight: 2, moves: 'e4 g6 d4 Bg7 Nf3 d6 Be2 Nf6 Nc3 O-O O-O c6 a4 a5' },
    { id: 'alekhine-modern', name: 'Alekhine, Modern Variation', tags: ['e4', 'alekhine', 'main'], weight: 3, moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 h3 Bh5' },
    { id: 'alekhine-exchange', name: 'Alekhine, Exchange Variation', tags: ['e4', 'alekhine', 'exchange', 'solid'], weight: 2, moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7 Rc1 O-O' },
    { id: 'alekhine-four-pawns', name: 'Alekhine, Four Pawns Attack', tags: ['e4', 'alekhine', 'sharp'], weight: 2, moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6' },

    // ── 1.d4 d5 · Queen's Gambit Declined ────────────────────────────────────
    { id: 'qgd-tartakower', name: "Queen's Gambit Declined, Tartakower", tags: ['d4', 'd5', 'qgd', 'qg', 'main', 'solid'], weight: 6, moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6' },
    { id: 'qgd-lasker', name: "Queen's Gambit Declined, Lasker Defence", tags: ['d4', 'd5', 'qgd', 'qg', 'main', 'solid'], weight: 3, moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7' },
    { id: 'qgd-via-nf6', name: "Queen's Gambit Declined via 1...Nf6 (3.Nc3 d5)", tags: ['d4', 'qgd', 'qg', 'main', 'solid'], weight: 3, moves: 'd4 Nf6 c4 e6 Nc3 d5 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6' },
    { id: 'qgd-exchange', name: "Queen's Gambit Declined, Exchange", tags: ['d4', 'd5', 'qgd', 'qg', 'exchange', 'main', 'solid'], weight: 6, moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 Nbd7 Qc2 O-O' },
    { id: 'qgd-bf4', name: "Queen's Gambit Declined, 5.Bf4", tags: ['d4', 'd5', 'qgd', 'qg', 'main'], weight: 5, moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 a3 Nc6' },
    { id: 'qgd-bf4-via-nf6', name: "Queen's Gambit Declined, 5.Bf4 (via 1...Nf6 and 3.Nf3)", tags: ['d4', 'qgd', 'qg', 'main'], weight: 3, moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6' },
    { id: 'qgd-ragozin', name: "Queen's Gambit Declined, Ragozin", tags: ['d4', 'd5', 'qgd', 'qg', 'main'], weight: 3, moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 h6 Bxf6 Qxf6 e3 O-O Rc1 dxc4' },
    { id: 'qgd-semi-tarrasch', name: 'Semi-Tarrasch Defence', tags: ['d4', 'd5', 'qgd', 'qg', 'main'], weight: 2, moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 c5 cxd5 Nxd5 e4 Nxc3 bxc3 cxd4 cxd4 Bb4+' },
    { id: 'tarrasch', name: 'Tarrasch Defence', tags: ['d4', 'd5', 'qgd', 'qg', 'main', 'sharp'], weight: 2, moves: 'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O' },
    { id: 'albin-countergambit', name: 'Albin Countergambit', tags: ['d4', 'd5', 'qg', 'gambit', 'sharp', 'offbeat'], weight: 2, moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Bg4 Bg2 Qd7 O-O O-O-O' },

    // ── 1.d4 d5 · Slav, Semi-Slav, QGA ───────────────────────────────────────
    { id: 'slav-main', name: 'Slav Defence, Main Line 5.a4', tags: ['d4', 'd5', 'slav', 'qg', 'main', 'solid'], weight: 6, moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O' },
    { id: 'slav-e3', name: 'Slav Defence, 4.e3', tags: ['d4', 'd5', 'slav', 'qg', 'main', 'solid'], weight: 4, moves: 'd4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4 Bg6 Nxg6 hxg6 Bd3 Nbd7' },
    { id: 'slav-exchange', name: 'Slav Defence, Exchange', tags: ['d4', 'd5', 'slav', 'qg', 'exchange', 'solid'], weight: 4, moves: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6 Bb5 Nd7' },
    { id: 'semi-slav-meran', name: 'Semi-Slav, Meran', tags: ['d4', 'd5', 'slav', 'qg', 'main'], weight: 4, moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7' },
    { id: 'semi-slav-anti-meran', name: 'Semi-Slav, 6.Qc2', tags: ['d4', 'd5', 'slav', 'qg', 'main', 'solid'], weight: 3, moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4' },
    { id: 'semi-slav-moscow', name: 'Semi-Slav, Moscow Variation', tags: ['d4', 'd5', 'slav', 'qg', 'main', 'sharp'], weight: 2, moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4' },
    { id: 'qga-classical', name: "Queen's Gambit Accepted, Classical", tags: ['d4', 'd5', 'qga', 'qg', 'main'], weight: 4, moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 a4 Nc6 Qe2 cxd4' },
    { id: 'qga-e4', name: "Queen's Gambit Accepted, 3.e4", tags: ['d4', 'd5', 'qga', 'qg', 'main', 'sharp'], weight: 3, moves: 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6 Bxe6 fxe6 Qb3 Qd7' },

    // ── 1.d4 · Catalan ───────────────────────────────────────────────────────
    { id: 'catalan-open', name: 'Catalan, Open', tags: ['d4', 'qgd', 'catalan', 'main'], weight: 5, moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2 a6 Qxc4 b5' },
    { id: 'catalan-closed', name: 'Catalan, Closed', tags: ['d4', 'qgd', 'catalan', 'main', 'solid'], weight: 4, moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O c6 Qc2 Nbd7 Nbd2 b6' },
    { id: 'catalan-bb4', name: 'Catalan, 3...Bb4+', tags: ['d4', 'catalan', 'nimzo', 'solid'], weight: 2, moves: 'd4 Nf6 c4 e6 g3 Bb4+ Bd2 Be7 Bg2 d5 Nf3 O-O O-O c6' },
    { id: 'catalan-via-qgd', name: 'Catalan via the QGD', tags: ['d4', 'd5', 'qgd', 'catalan', 'main'], weight: 3, moves: 'd4 d5 c4 e6 Nf3 Nf6 g3 Be7 Bg2 O-O O-O dxc4 Qc2 a6 Qxc4 b5' },

    // ── 1.d4 · London, Colle, Trompowsky, Blackmar-Diemer ────────────────────
    { id: 'london-d5-c5', name: 'London System vs ...d5 and ...c5', tags: ['d4', 'd5', 'london', 'qgd', 'main', 'solid'], weight: 6, moves: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3 b6' },
    { id: 'london-d5-e6', name: 'London System vs ...e6', tags: ['d4', 'd5', 'london', 'qgd', 'main', 'solid'], weight: 4, moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3 O-O Nbd2 c5 c3 Nc6 Bd3 b6' },
    { id: 'london-slav-setup', name: 'London System vs ...c6 and ...Bf5', tags: ['d4', 'd5', 'london', 'slav', 'solid'], weight: 3, moves: 'd4 d5 Bf4 Nf6 e3 c6 Nf3 Bf5 Bd3 Bxd3 Qxd3 e6 O-O Bd6 c4 O-O' },
    { id: 'london-qb6', name: 'London System vs ...c5 and ...Qb6', tags: ['d4', 'd5', 'london', 'sharp'], weight: 2, moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Qb6 Qb3 c4 Qc2 Nf6 Nd2 g6 b3 Bf5' },
    { id: 'london-kid', name: "London System vs King's Indian setup", tags: ['d4', 'kid', 'london', 'solid'], weight: 5, moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 d6 h3 O-O Be2 c5 c3 Nc6 O-O Nd7' },
    { id: 'london-e6', name: 'London System vs ...e6', tags: ['d4', 'london', 'qgd', 'solid'], weight: 3, moves: 'd4 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nd2 d5 Ngf3 Bd6 Bg3 O-O Bd3 b6' },
    { id: 'london-c5', name: 'London System vs ...c5', tags: ['d4', 'benoni', 'london', 'solid'], weight: 2, moves: 'd4 Nf6 Bf4 c5 e3 cxd4 exd4 d5 Nf3 Nc6 c3 Bg4 Nbd2 e6 Qb3 Qc8' },
    { id: 'london-dutch', name: 'London System vs the Dutch', tags: ['d4', 'dutch', 'london', 'solid'], weight: 2, moves: 'd4 f5 Bf4 Nf6 e3 e6 Nf3 b6 Bd3 Bb7 O-O Be7 c4 O-O Nc3 Ne4' },
    { id: 'colle-classic', name: 'Colle System', tags: ['d4', 'd5', 'colle', 'qgd', 'solid'], weight: 3, moves: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5' },
    { id: 'colle-zukertort', name: 'Colle-Zukertort System', tags: ['d4', 'colle', 'qgd', 'solid'], weight: 2, moves: 'd4 Nf6 Nf3 e6 e3 c5 Bd3 d5 b3 Nc6 O-O Bd6 Bb2 O-O Nbd2 b6' },
    { id: 'colle-kid', name: "Colle vs King's Indian setup", tags: ['d4', 'kid', 'colle', 'solid'], weight: 2, moves: 'd4 Nf6 Nf3 g6 e3 Bg7 Be2 O-O O-O d6 c4 Nbd7 Nc3 e5' },
    { id: 'trompowsky-ne4', name: 'Trompowsky, 2...Ne4', tags: ['d4', 'trompowsky', 'sharp'], weight: 2, moves: 'd4 Nf6 Bg5 Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 d5 Qb6' },
    { id: 'trompowsky-e6', name: 'Trompowsky, 2...e6', tags: ['d4', 'trompowsky', 'solid'], weight: 2, moves: 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nc3 d6 Qd2 g5' },
    { id: 'trompowsky-d5', name: 'Trompowsky, 2...d5', tags: ['d4', 'd5', 'trompowsky', 'qgd', 'solid'], weight: 2, moves: 'd4 Nf6 Bg5 d5 e3 e6 Nd2 Be7 Ngf3 O-O Bd3 c5 c3 Nbd7' },
    { id: 'blackmar-diemer', name: 'Blackmar-Diemer Gambit, Euwe Defence', tags: ['d4', 'd5', 'gambit', 'sharp', 'offbeat'], weight: 1, moves: 'd4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3 e6 Bg5 Be7 Bd3 Nc6 O-O O-O' },

    // ── 1.d4 Nf6 2.c4 e6 · Nimzo-Indian, Queen's Indian, Bogo ────────────────
    { id: 'nimzo-rubinstein', name: 'Nimzo-Indian, Rubinstein 4.e3', tags: ['d4', 'nimzo', 'main', 'solid'], weight: 6, moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 Nc6' },
    { id: 'nimzo-classical', name: 'Nimzo-Indian, Classical 4.Qc2', tags: ['d4', 'nimzo', 'main'], weight: 5, moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 f3 h6' },
    { id: 'nimzo-4nf3', name: 'Nimzo-Indian, 4.Nf3', tags: ['d4', 'nimzo', 'main'], weight: 3, moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5' },
    { id: 'nimzo-saemisch', name: 'Nimzo-Indian, Sämisch', tags: ['d4', 'nimzo', 'sharp'], weight: 2, moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6' },
    { id: 'nimzo-4f3', name: 'Nimzo-Indian, Kmoch 4.f3', tags: ['d4', 'nimzo', 'sharp'], weight: 2, moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Bxc3+ bxc3 c5 cxd5 Nxd5 dxc5 f5' },
    { id: 'qid-main', name: "Queen's Indian, 4.g3 Ba6", tags: ['d4', 'qid', 'main', 'solid'], weight: 4, moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5' },
    { id: 'qid-petrosian', name: "Queen's Indian, Petrosian 4.a3", tags: ['d4', 'qid', 'main'], weight: 3, moves: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Nxc3 bxc3 Be7' },
    { id: 'bogo-indian', name: 'Bogo-Indian', tags: ['d4', 'nimzo', 'main', 'solid'], weight: 3, moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Qe7 g3 Nc6 Bg2 Bxd2+ Nbxd2 d6 O-O O-O' },

    // ── 1.d4 Nf6 2.c4 g6 · King's Indian, Grünfeld ───────────────────────────
    { id: 'kid-classical', name: "King's Indian, Classical Main Line", tags: ['d4', 'kid', 'main', 'sharp'], weight: 7, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7' },
    { id: 'kid-exchange', name: "King's Indian, Exchange Variation", tags: ['d4', 'kid', 'exchange', 'solid'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5 dxe5 Qxd8 Rxd8' },
    { id: 'kid-petrosian', name: "King's Indian, Petrosian System", tags: ['d4', 'kid', 'main', 'solid'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Bg5 h6' },
    { id: 'kid-saemisch', name: "King's Indian, Sämisch", tags: ['d4', 'kid', 'main', 'sharp'], weight: 4, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 f5' },
    { id: 'kid-saemisch-c5', name: "King's Indian, Sämisch 6...c5 Gambit", tags: ['d4', 'kid', 'sharp', 'gambit'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5 dxc5 dxc5 Qxd8 Rxd8' },
    { id: 'kid-four-pawns', name: "King's Indian, Four Pawns Attack", tags: ['d4', 'kid', 'sharp'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5' },
    { id: 'kid-averbakh', name: "King's Indian, Averbakh", tags: ['d4', 'kid', 'main'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5 d5 e6 Qd2 exd5' },
    { id: 'kid-fianchetto', name: "King's Indian, Fianchetto", tags: ['d4', 'kid', 'main', 'solid'], weight: 4, moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6' },
    { id: 'grunfeld-exchange', name: 'Grünfeld, Exchange 7.Bc4', tags: ['d4', 'grunfeld', 'exchange', 'main', 'sharp'], weight: 4, moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6' },
    { id: 'grunfeld-exchange-nf3', name: 'Grünfeld, Modern Exchange 7.Nf3', tags: ['d4', 'grunfeld', 'exchange', 'main'], weight: 4, moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O' },
    { id: 'grunfeld-russian', name: 'Grünfeld, Russian System', tags: ['d4', 'grunfeld', 'main'], weight: 2, moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 a6 Be2 b5' },
    { id: 'grunfeld-bf4', name: 'Grünfeld, 4.Bf4', tags: ['d4', 'grunfeld', 'main', 'solid'], weight: 3, moves: 'd4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 e3 c5 dxc5 Qa5 Rc1 dxc4 Bxc4 O-O' },
    { id: 'grunfeld-fianchetto', name: 'Grünfeld, Fianchetto', tags: ['d4', 'grunfeld', 'solid'], weight: 2, moves: 'd4 Nf6 c4 g6 g3 d5 cxd5 Nxd5 Bg2 Bg7 Nf3 O-O O-O Nb6' },

    // ── 1.d4 Nf6 2.c4 c5 · Benoni, Benko ─────────────────────────────────────
    { id: 'benoni-modern', name: 'Modern Benoni, Classical', tags: ['d4', 'benoni', 'main', 'sharp'], weight: 4, moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O' },
    { id: 'benoni-fianchetto', name: 'Modern Benoni, Fianchetto', tags: ['d4', 'benoni', 'main', 'solid'], weight: 2, moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O' },
    { id: 'benoni-flick-knife', name: 'Modern Benoni, Taimanov (Flick-Knife)', tags: ['d4', 'benoni', 'sharp'], weight: 1, moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7' },
    { id: 'benko-accepted', name: 'Benko Gambit Accepted', tags: ['d4', 'benoni', 'main', 'gambit', 'sharp'], weight: 3, moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1 d6' },
    { id: 'benko-declined', name: 'Benko Gambit, 4.Nf3', tags: ['d4', 'benoni', 'gambit', 'solid'], weight: 2, moves: 'd4 Nf6 c4 c5 d5 b5 Nf3 g6 cxb5 a6 b6 d6 Nc3 Bg7' },

    // ── 1.d4 f5 · Dutch Defence ──────────────────────────────────────────────
    { id: 'dutch-leningrad', name: 'Dutch, Leningrad', tags: ['d4', 'dutch', 'main', 'sharp'], weight: 4, moves: 'd4 f5 c4 Nf6 g3 g6 Bg2 Bg7 Nf3 O-O O-O d6 Nc3 Qe8 d5 a5' },
    { id: 'dutch-stonewall', name: 'Dutch, Stonewall', tags: ['d4', 'dutch', 'main', 'solid'], weight: 4, moves: 'd4 f5 c4 Nf6 g3 e6 Bg2 d5 Nf3 c6 O-O Bd6 b3 Qe7 Ne5 O-O' },
    { id: 'dutch-classical', name: 'Dutch, Classical', tags: ['d4', 'dutch', 'main', 'solid'], weight: 2, moves: 'd4 f5 c4 Nf6 g3 e6 Bg2 Be7 Nf3 O-O O-O d6 Nc3 Qe8 Re1 Qg6' },
    { id: 'dutch-nf3-g3', name: 'Dutch, Leningrad via 2.Nf3', tags: ['d4', 'dutch', 'solid'], weight: 2, moves: 'd4 f5 Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O c4 d6 Nc3 Qe8' },
    { id: 'dutch-staunton', name: 'Dutch, Staunton Gambit', tags: ['d4', 'dutch', 'gambit', 'sharp'], weight: 2, moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qd4 Nf7' },
    { id: 'dutch-bg5', name: 'Dutch, 2.Bg5', tags: ['d4', 'dutch', 'trompowsky', 'sharp'], weight: 2, moves: 'd4 f5 Bg5 g6 Nd2 Bg7 c3 Nf6 e3 d6 Ngf3 O-O' },

    // ── 1.d4 Nf6 2.c4 e5 · Budapest; other 1.d4 defences ─────────────────────
    { id: 'budapest-bf4', name: 'Budapest Gambit, 4.Bf4', tags: ['d4', 'budapest', 'main', 'gambit', 'sharp'], weight: 2, moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5' },
    { id: 'budapest-nf3', name: 'Budapest Gambit, 4.Nf3', tags: ['d4', 'budapest', 'gambit', 'sharp'], weight: 1, moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5 O-O O-O' },
    { id: 'budapest-e4', name: 'Budapest Gambit, 4.e4', tags: ['d4', 'budapest', 'gambit', 'sharp'], weight: 1, moves: 'd4 Nf6 c4 e5 dxe5 Ng4 e4 Nxe5 f4 Nec6 Be3 Bb4+ Nc3 Qe7' },
    { id: 'old-indian', name: 'Old Indian Defence', tags: ['d4', 'kid', 'solid', 'offbeat'], weight: 1, moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6' },
    { id: 'modern-vs-d4', name: "Modern Defence vs 1.d4 (King's Indian)", tags: ['d4', 'kid', 'modern', 'main'], weight: 2, moves: 'd4 g6 c4 Bg7 Nc3 d6 e4 Nf6 Nf3 O-O Be2 e5 O-O Nc6' },

    // ── 1.c4 · English Opening ───────────────────────────────────────────────
    { id: 'english-reversed-sicilian', name: 'English, Reversed Sicilian', tags: ['c4', 'english', 'e5', 'main'], weight: 5, moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O' },
    { id: 'english-closed', name: 'English, Closed', tags: ['c4', 'english', 'e5', 'sharp'], weight: 3, moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 e3 d6 Nge2 Nge7 Rb1 a5 a3 O-O' },
    { id: 'english-symmetrical', name: 'English, Symmetrical', tags: ['c4', 'english', 'solid'], weight: 4, moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7 d3 O-O' },
    { id: 'english-symmetrical-d5', name: 'English, Symmetrical Four Knights', tags: ['c4', 'english', 'sharp'], weight: 2, moves: 'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nc7 O-O e5' },
    { id: 'english-kid', name: "English vs King's Indian setup", tags: ['c4', 'english', 'kid', 'main'], weight: 4, moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Nf3 O-O Be2 e5 O-O Nc6' },
    { id: 'english-kid-g3', name: "English, King's Indian with g3", tags: ['c4', 'english', 'kid', 'solid'], weight: 3, moves: 'c4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nf3 d6 O-O e5 d3 Nc6' },
    { id: 'english-qgd', name: "English into the Queen's Gambit Declined", tags: ['c4', 'english', 'qgd', 'main', 'solid'], weight: 3, moves: 'c4 e6 Nc3 d5 d4 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6' },
    { id: 'english-nimzo', name: 'English, Nimzo-English', tags: ['c4', 'english', 'nimzo', 'solid'], weight: 2, moves: 'c4 Nf6 Nc3 e6 Nf3 Bb4 Qc2 O-O a3 Bxc3 Qxc3 b6 e3 Bb7' },
    { id: 'english-slav', name: 'English into the Semi-Slav', tags: ['c4', 'english', 'slav', 'solid'], weight: 2, moves: 'c4 c6 Nf3 d5 e3 Nf6 Nc3 e6 d4 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7' },
    { id: 'english-agincourt', name: 'English, Agincourt', tags: ['c4', 'english', 'qgd', 'solid'], weight: 2, moves: 'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6' },

    // ── 1.Nf3 · Réti, King's Indian Attack; flank openings ───────────────────
    { id: 'reti-slav-setup', name: 'Réti vs ...c6 and ...Bg4', tags: ['nf3', 'reti', 'slav', 'solid'], weight: 3, moves: 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4 dxe4 dxe4 Bc5' },
    { id: 'reti-catalan', name: 'Réti into the Catalan', tags: ['nf3', 'reti', 'catalan', 'qgd', 'main'], weight: 3, moves: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O d4 dxc4 Qc2 a6 Qxc4 b5' },
    { id: 'reti-qgd', name: "Réti into the Queen's Gambit Declined", tags: ['nf3', 'reti', 'qgd', 'main'], weight: 2, moves: 'Nf3 d5 d4 Nf6 c4 e6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5' },
    { id: 'kia-french-setup', name: "King's Indian Attack vs ...e6 and ...d5", tags: ['nf3', 'reti', 'qgd', 'solid'], weight: 2, moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6' },
    { id: 'reti-kid', name: "Réti vs King's Indian setup", tags: ['nf3', 'reti', 'kid', 'solid'], weight: 2, moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 e4 e5 Nc3 Nc6' },
    { id: 'reti-into-kid', name: "Réti into the King's Indian", tags: ['nf3', 'kid', 'main', 'sharp'], weight: 2, moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5 O-O Nc6' },
    { id: 'bird', name: "Bird's Opening", tags: ['flank', 'offbeat', 'solid'], weight: 1, moves: 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5' },
    { id: 'larsen', name: "Nimzowitsch-Larsen Attack", tags: ['flank', 'offbeat', 'solid'], weight: 1, moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 d6 Ne2 Bd7 O-O Be7' },
    { id: 'kings-fianchetto', name: "King's Fianchetto Opening", tags: ['flank', 'offbeat', 'solid'], weight: 1, moves: 'g3 d5 Bg2 Nf6 Nf3 c6 O-O Bg4 d3 Nbd7' },
  ],
};
