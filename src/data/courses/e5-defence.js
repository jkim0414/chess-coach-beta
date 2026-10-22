// 1...e5: Classical Defence — a complete repertoire for Black against 1.e4.
// Shared move prefixes are defined once so their notes stay consistent across lines.

const E4E5 = [
  ['e4', 'White takes the centre and opens lines for the f1 bishop and the queen.'],
  ['e5', 'Claim your share of the centre at once. The e5 pawn controls d4 and f4 and opens lines for your f8 bishop and queen.'],
];

const KNIGHTS = [
  ...E4E5,
  ['Nf3', 'The most common move: develops and attacks e5.'],
  ['Nc6', 'Defend e5 with a developing move. The knight also eyes d4, so whenever White plays d4 your pieces already pressure that square.'],
];

// ---------- Italian ----------
const ITALIAN = [
  ...KNIGHTS,
  ['Bc4', 'The Italian: the bishop aims at f7, which only your king defends.'],
  ['Bc5', 'Mirror it: the bishop hits f2 and d4. Unlike 3...Nf6, this does not allow the Fried Liver, because Ng5 can be met by ...Qxg5 or ...Nh6.'],
];

const GIUOCO = [
  ...ITALIAN,
  ['c3', 'Preparing d4 to build a big centre and kick your c5 bishop.'],
  ['Nf6', 'Counter-attack e4 right away. Because e4 is now under fire, an early d4 can be met by ...exd4 and a check or a ...d5 strike.'],
];

const ITALIAN_D4 = [
  ...GIUOCO,
  ['d4', 'The direct central push, hitting e5 and preparing to chase the c5 bishop.'],
  ['exd4', 'Take. Retreating with 5...Bb6? lets White keep a huge centre and push d5 or e5 with tempo. After the capture you get a check or a ...d5 strike.'],
];

const ITALIAN_CXD4 = [
  ...ITALIAN_D4,
  ['cxd4', 'White now has the classical pawn duo on e4 and d4.'],
  ['Bb4+', 'Check with tempo. Do not retreat to b6: White would answer d5 and e5 and gain lots of space. The check forces White to block.'],
];

const PIANISSIMO = [
  ...GIUOCO,
  ['d3', 'The Giuoco Pianissimo ("very quiet game"): White keeps e4 solid and manoeuvres. This is the most common Italian at every level.'],
  ['d6', 'Mirror solidly. The d6 pawn guards e5 and opens the c8 bishop. The fight is about piece placement and well-timed breaks, not early tactics.'],
  ['O-O', 'White castles and keeps all options open: a4, b4, Bb3, Re1 and d4 later.'],
  ['a6', 'Useful prophylaxis: if b4 or d4 comes, the bishop drops back to a7 and still aims at f2. It also controls b5, so b4-b5 cannot easily kick your knight.'],
];

// ---------- Ruy Lopez ----------
const RUY_A6 = [
  ...KNIGHTS,
  ['Bb5', 'The Ruy Lopez: White pressures the c6 knight, the defender of e5.'],
  ['a6', 'Ask the bishop at once. e5 is not really hanging yet: after Bxc6 dxc6 Nxe5, ...Qd4 wins the pawn back.'],
];

const RUY = [
  ...RUY_A6,
  ['Ba4', 'Keeping the pressure on c6.'],
  ['Nf6', 'Develop with an attack on e4.'],
  ['O-O', 'White castles; ...Nxe4 would now invite Re1 and lines White knows well.'],
  ['Be7', 'The solid Closed Ruy. You prepare to castle and keep everything protected; no need for the sharp Open Ruy with 5...Nxe4.'],
];

const RUY_B5 = [
  ...RUY,
  ['Re1', 'Now Bxc6 and Nxe5 is a real threat, because e4 is defended.'],
  ['b5', 'Kill the threat at once: the bishop is driven away and can no longer take on c6.'],
  ['Bb3', 'The bishop settles on b3, still eyeing f7.'],
  ['d6', 'Support e5 with a pawn and open the c8 bishop. A sturdy, classical set-up that needs little memorisation.'],
];

const RUY_CLOSED = [
  ...RUY_B5,
  ['c3', 'Preparing d4 and giving the bishop a retreat square on c2.'],
  ['O-O', 'Castle. Your king is safe and the rooks connect; now choose a plan based on what White does.'],
];

// ---------- Scotch ----------
const SCOTCH_D4 = [
  ...KNIGHTS,
  ['d4', 'White opens the centre immediately.'],
  ['exd4', 'Take. Holding e5 with ...d6 is possible but passive; open play suits your quick development.'],
];

const SCOTCH = [
  ...SCOTCH_D4,
  ['Nxd4', 'The Scotch Game. White has a knight in the centre and a half-open d-file.'],
  ['Bc5', 'The Classical Scotch. Hit the d4 knight at once; with ...Qf6 next, d4 and f2 come under real pressure.'],
];

const SCOTCH_GAMBIT = [
  ...SCOTCH_D4,
  ['Bc4', 'The Scotch Gambit: White leaves the pawn and develops, aiming at f7.'],
  ['Bc5', 'Hold the extra pawn with a developing move, the same bishop as in the Italian. 4...Nf6 is also played but allows sharp Two Knights and Max Lange lines.'],
];

// ---------- Four Knights ----------
const FOUR_KNIGHTS = [
  ...KNIGHTS,
  ['Nc3', 'The Four Knights: solid, calm development.'],
  ['Nf6', 'Develop and hit e4. Symmetry is perfectly fine here.'],
];

// ---------- Vienna ----------
const VIENNA = [
  ...E4E5,
  ['Nc3', 'The Vienna: White keeps the f-pawn free for f4.'],
  ['Nf6', 'Develop and hit e4. This is the most flexible reply against both f4 and Bc4.'],
];

const VIENNA_GAMBIT = [
  ...VIENNA,
  ['f4', 'The Vienna Gambit, a King\'s Gambit with Nc3 included.'],
  ['d5', 'Strike in the centre! 3...exf4 allows 4.e5 with tempo on f6. With ...d5 you open lines while White\'s king is the more exposed one.'],
  ['fxe5', 'White grabs space and attacks the f6 knight.'],
  ['Nxe4', 'The knight jumps into the centre, protected by d5 and hitting c3. It is a monster here.'],
];

const VIENNA_BC4 = [
  ...VIENNA,
  ['Bc4', 'White aims the bishop at f7, Italian style.'],
  ['Bc5', 'Mirror it, as in our Italian. Your bishop also watches g1, which will matter if White pushes f4.'],
  ['d3', 'Solidly protecting e4.'],
  ['Nc6', 'Develop. If White plays Nf3 now, you are back in our Italian Four Knights and continue with ...d6.'],
  ['f4', 'A delayed gambit idea, opening the f-file.'],
  ['d6', 'Keep e5 firmly protected so fxe5 opens nothing. With the c5 bishop on the g1-a7 diagonal, White cannot castle kingside.'],
  ['Nf3', 'Developing and attacking e5 again.'],
  ['Bg4', 'Pin the f3 knight, the key defender of e5 and d4. This pin also sets up a strong ...Nd4.'],
];

// ---------- King's Gambit ----------
const KG = [
  ...E4E5,
  ['f4', 'The King\'s Gambit: White offers a pawn to deflect e5 and open the f-file.'],
  ['exf4', 'Accept. It is the engine\'s top choice, and the f4 pawn gets in the way of White\'s c1 bishop.'],
];

const KG_MODERN = [
  ...KG,
  ['Nf3', 'Stopping ...Qh4+ and preparing d4.'],
  ['d5', 'The Modern Defence: hit the centre at once and return the pawn on your terms. Your pieces come out fast; no need to cling to f4 with ...g5.'],
  ['exd5', 'Taking is the main line; d3 or Nc3 allow ...dxe4 with an easy game.'],
  ['Nf6', 'Develop and attack d5. Usually you recapture there with the knight, centralising it.'],
];

// ---------- Centre Game / Danish ----------
const CENTRE = [
  ...E4E5,
  ['d4', 'Opening the centre at once.'],
  ['exd4', 'Take. White must spend time recapturing.'],
];

// ---------- Early queen ----------
const QH5 = [
  ...E4E5,
  ['Qh5', 'An early queen sortie: White attacks e5 and dreams of Bc4 and Qxf7 mate (Scholar\'s Mate).'],
  ['Nc6', 'Defend e5 with a developing move. Stay calm: the early queen will soon be a target for your pieces.'],
  ['Bc4', 'Now Qxf7 mate is threatened.'],
  ['g6', 'Block the queen\'s path to f7 with tempo. Never 3...Nf6?? 4.Qxf7 mate. 3...Qe7 also works, but ...g6 kicks the queen.'],
  ['Qf3', 'Renewing the threat against f7.'],
  ['Nf6', 'Shield f7 by blocking the f-file and develop. You are already ahead in development; next ...Bg7 and ...O-O.'],
];

export default {
  id: 'e5-defence',
  name: '1...e5: Classical Defence',
  side: 'black',
  level: 'Beginner → Intermediate (≈800–1800)',
  tagline: 'Meet 1.e4 with 1...e5 and answer every open game, early attack and gambit with sound development and well-timed ...d5 strikes.',
  overview:
    'This course gives you a complete, classical answer to 1.e4. You reply 1...e5, develop with ...Nc6, ...Nf6 and ...Bc5 or ...Be7, castle early, and fight for the centre. These are the positions club players meet most: Italians, Ruy Lopez, Scotch, Vienna, King\'s Gambit, Danish and early queen attacks.\n\n' +
    'The repertoire is built around one bishop: against the Italian, the Scotch, the Scotch Gambit and the Vienna you put your bishop on c5, aiming at f2. This sidesteps the Fried Liver completely, and in the quiet d3 systems it gives you a calm, solid game. Against the Ruy Lopez you play the time-tested Closed set-up with ...a6, ...Nf6, ...Be7, ...b5 and ...d6. Against gambits you usually take the pawn and give it back at a moment of your choosing.\n\n' +
    'Three ideas run through every chapter. First, f7 is your weakest square before you castle, so count its defenders whenever a bishop and queen line up on it. Second, the counter-strike ...d5 is your main weapon against c3-d4 centres, the Vienna Gambit, the King\'s Gambit and the Danish. Third, when White attacks one of your pieces, look for a check or a counter-attack before retreating.\n\n' +
    'The Traps chapter collects the tricks you will see again and again: Ng5 and Nxe5 shots that fail, Scholar\'s Mate attempts, and natural mistakes you can punish to win material.',
  keyIdeas: [
    'f7 is your weak point and f2 is White\'s: keep f7 covered (...Nf6, ...g6 against an early queen, castle early) and aim your c5 bishop at f2.',
    'The ...d5 break is your main freeing move: against c3-d4 centres, the Vienna and King\'s Gambits and the Danish it opens lines and frees your pieces.',
    'Counter-attack before retreating: when a pawn hits your piece, check for ...Bb4+, ...d5 or a hit on f2 first. Passive retreats like ...Bb6 often hand White the centre.',
    'Against gambits, take the pawn when it is safe and return it when that kills the initiative: the queen trade in the Evans, ...d5 in the King\'s Gambit, ...Nd6 in the Moller.',
    'In slow Italians and the Ruy, play prophylaxis (...a6, ...h6, ...Ba7) and trade White\'s best attacker, the light-squared bishop, with ...Be6 or ...Na5.',
    'Punish early queens and cheap knight jumps by developing with tempo: kick the queen, look for ...Nd4 hitting c2, and take free material once you have checked the tactics.',
  ],
  lines: [
    // =====================================================================
    // Italian: the c3-d4 centre
    // =====================================================================
    {
      id: 'italian-c3-d4-bd2',
      group: 'Italian 3.Bc4 Bc5: the c3–d4 centre',
      name: 'Giuoco Piano, 7.Bd2 Bxd2+ 8.Nbxd2 d5',
      weight: 9,
      trap: false,
      moves: [
        ...ITALIAN_CXD4,
        ['Bd2', 'The solid block, offering to trade the dark-squared bishops.'],
        ['Bxd2+', 'Trade and keep it simple. (7...Nxe4 is also good but sharper.) The trade clears the way for the key ...d5 break.'],
        ['Nbxd2', 'The knight recaptures so that e4 stays protected.'],
        ['d5', 'The key central break: it removes White\'s e4 pawn and opens lines. Without it White plays e5 and gains a big space advantage.'],
        ['exd5', 'White has to take, or e4 falls.'],
        ['Nxd5', 'Now White is left with an isolated pawn on d4. Your long-term plan: blockade it on d5, trade pieces, and attack it.'],
        ['Qb3', 'Pressure on the d5 knight and the b7 pawn.'],
        ['Nce7', 'Support the d5 knight with a second piece so it can never be driven away. From e7 the knight can also jump to f5 to hit d4.'],
        ['O-O', 'White castles and will put rooks on the open files.'],
        ['O-O', 'Castle. Your king is safe and the d5 blockade is rock solid.'],
        ['Rfe1', 'The rook takes the open e-file.'],
        ['c6', 'Cement the d5 knight with a pawn. Next ...Qb6, ...Be6 and ...Nf5, piling up on d4.'],
      ],
      summary: 'White has an isolated d4 pawn. Keep a knight on d5, trade pieces (every trade weakens d4) and aim ...Nf5, ...Be6 and ...Qb6 at it.',
    },
    {
      id: 'italian-c3-d4-moller',
      group: 'Italian 3.Bc4 Bc5: the c3–d4 centre',
      name: 'Giuoco Piano, 7.Nc3 Nxe4 8.O-O Bxc3 9.d5 Ne5',
      weight: 6,
      trap: false,
      moves: [
        ...ITALIAN_CXD4,
        ['Nc3', 'The aggressive try: White offers the e4 pawn for fast development.'],
        ['Nxe4', 'Take it. Passive moves like 7...O-O let White push e5 or d5 with a strong centre.'],
        ['O-O', 'White develops and sets up tricks against your pieces on c3 and e4.'],
        ['Bxc3', 'Remove the knight that attacks your e4 knight. If 9.bxc3, then 9...d5! hits the c4 bishop and you keep the extra pawn.'],
        ['d5', 'The Moller Attack: d5 hits the c6 knight and prepares Re1 against your king on the e-file.'],
        ['Ne5', 'The cleanest answer: the knight jumps out with tempo on the c4 bishop. 9...Bf6 is also playable but leads into sharp Moller theory.'],
        ['bxc3', 'White wins back a piece.'],
        ['Nxc4', 'Take the bishop. You now have two knights in the middle of the board, and White will try to win one back.'],
        ['Qd4', 'A queen fork: it hits the knights on c4 and e4, and g7.'],
        ['O-O', 'Protect g7 by castling. You will give one knight back, but stay a clean pawn up with a safe king.'],
        ['Qxe4', 'White regains the piece.'],
        ['Nd6', 'The knight retreats with tempo on the queen and blockades the d5 pawn. Next ...Re8, ...b6 and ...Bb7: you are simply a pawn up.'],
      ],
      summary: 'You survived the Moller Attack a pawn up. Keep the d6 knight as a blockader, finish development with ...Re8, ...b6, ...Bb7, and trade pieces.',
    },
    {
      id: 'italian-c3-d4-e5',
      group: 'Italian 3.Bc4 Bc5: the c3–d4 centre',
      name: 'Giuoco Piano, 6.e5 d5',
      weight: 5,
      trap: false,
      moves: [
        ...ITALIAN_D4,
        ['e5', 'White kicks the f6 knight instead of recapturing on d4.'],
        ['d5', 'The classic counter: hit the c4 bishop instead of retreating. 6...Ne4? runs into 7.Bd5!, and 6...Ng8 just hands White the centre.'],
        ['Bb5', 'The bishop pins the c6 knight. (7.exf6 dxc4 is good for Black: you get the bishop back with open lines.)'],
        ['Ne4', 'Now the knight has a superb outpost, protected by the d5 pawn and hard to kick.'],
        ['cxd4', 'White regains the pawn and hits your bishop.'],
        ['Bb6', 'Keep the bishop on the a7-g1 diagonal, where it keeps hitting d4 and f2.'],
        ['Nc3', 'White develops and challenges the e4 knight.'],
        ['O-O', 'Castle first; your king is safe and the f-pawn can later support ...f6.'],
        ['Be3', 'Protecting d4.'],
        ['Bg4', 'Pin the f3 knight, a key defender of d4 and e5. Plans: ...f6 to break up the e5 pawn, or ...Nxc3 and ...Bxf3 to win d4.'],
      ],
      summary: 'Your knight on e4 and bishop on b6 press on White\'s centre. Break it up with ...f6 or win d4 by removing its defenders with ...Bxf3 and ...Nxc3.',
    },
    {
      id: 'italian-oo-c3',
      group: 'Italian 3.Bc4 Bc5: the c3–d4 centre',
      name: '4.O-O Nf6 5.c3 Nxe4!',
      weight: 4,
      trap: false,
      moves: [
        ...ITALIAN,
        ['O-O', 'Castling first is very popular at club level.'],
        ['Nf6', 'Develop and attack e4.'],
        ['c3', 'Preparing d4. But with White castled and c3 taking the knight\'s square, the e4 pawn now has no defender.'],
        ['Nxe4', 'Grab it! 5...d6? lets White play 6.d4 with a big centre for free. (If 6.Re1?? see the Traps chapter: ...Bxf2+ wins.)'],
        ['d4', 'White strikes back, attacking the c5 bishop.'],
        ['d5', 'Counter-attack the c4 bishop and support the e4 knight. After 7.dxc5 dxc4 you keep the extra pawn.'],
        ['dxc5', 'White takes the bishop.'],
        ['dxc4', 'And you take White\'s. Material: you are still a pawn up.'],
        ['Qe2', 'The queen hits the e4 knight and the c4 pawn.'],
        ['Qd3', 'Offer the queen trade. Without queens White has no compensation and your extra pawn counts.'],
        ['Qxd3', 'White accepts the trade.'],
        ['cxd3', 'The d3 pawn cramps White, blocking the b1 knight and c1 bishop.'],
        ['Re1', 'Attacking the e4 knight.'],
        ['f5', 'Support the knight with the f-pawn. Next ...O-O, ...Be6 and ...Rd8; you are a healthy pawn up.'],
      ],
      summary: 'A pawn up in a queenless middlegame. Keep the e4 knight supported, castle, bring a rook to d8 and use the d3 pawn to cramp White.',
    },

    // =====================================================================
    // Italian: quiet d3 systems
    // =====================================================================
    {
      id: 'pianissimo-a4',
      group: 'Italian 3.Bc4 Bc5: quiet d3 systems',
      name: 'Giuoco Pianissimo, 7.a4 Ba7 8.Re1',
      weight: 9,
      trap: false,
      moves: [
        ...PIANISSIMO,
        ['a4', 'White gains queenside space and prepares a5 or b4.'],
        ['Ba7', 'Retreat in advance so d4 or b4 never comes with tempo. On a7 the bishop still bites f2.'],
        ['Re1', 'Supporting a later d4 and the Nbd2-f1-g3 manoeuvre.'],
        ['O-O', 'Castle. Your king is safe and you are ready for central action.'],
        ['h3', 'Preventing ...Bg4 and ...Ng4.'],
        ['h6', 'The same idea for you: no Bg5 pin on the f6 knight.'],
        ['Nbd2', 'The knight heads for f1 and g3, the classic Italian route.'],
        ['Re8', 'Overprotect e5 before White plays d4, and free f8 for a defender if needed.'],
        ['Nf1', 'Continuing toward g3.'],
        ['Be6', 'Challenge the c4 bishop, White\'s best attacker. If Bxe6, recapture with ...Rxe6 or ...fxe6 and you are solid.'],
      ],
      summary: 'A slow manoeuvring game. Trade the c4 bishop with ...Be6, add ...Qd7 and ...Rad8, and prepare the freeing ...d5 when White commits to d4.',
    },
    {
      id: 'pianissimo-bb3',
      group: 'Italian 3.Bc4 Bc5: quiet d3 systems',
      name: 'Giuoco Pianissimo, 7.Bb3 Ba7',
      weight: 6,
      trap: false,
      moves: [
        ...PIANISSIMO,
        ['Bb3', 'Tucking the bishop away before ...Be6 or ...Na5 can hit it.'],
        ['Ba7', 'Same idea: get out of the way of d4 and b4 while keeping the f2 diagonal.'],
        ['Nbd2', 'The usual knight manoeuvre toward f1 and g3 or c4.'],
        ['O-O', 'Castle and complete your development.'],
        ['h3', 'Preventing ...Bg4.'],
        ['Be6', 'Offer to trade light-squared bishops. If Bxe6 fxe6, the f-file opens for your rook and ...d5 becomes easy.'],
      ],
      summary: 'Trade White\'s light-squared bishop with ...Be6, then build with ...Qd7, ...Rad8 and ...Ne7-g6. The ...d5 break is your main source of play.',
    },
    {
      id: 'italian-four-knights-bg5',
      group: 'Italian 3.Bc4 Bc5: quiet d3 systems',
      name: 'Italian Four Knights, 4.Nc3 Nf6 5.d3 d6 6.Bg5',
      weight: 6,
      trap: false,
      moves: [
        ...ITALIAN,
        ['Nc3', 'The Italian Four Knights: calm development.'],
        ['Nf6', 'Develop and hit e4. (5.Nxe5? is a known fork trick that fails: see Traps.)'],
        ['d3', 'Protecting e4.'],
        ['d6', 'Solid: support e5 and open the c8 bishop.'],
        ['Bg5', 'Pinning the f6 knight to your queen.'],
        ['h6', 'Ask the question at once. After 7.Bh4 g5 8.Bg3 the pin is gone; after 7.Bxf6 you get the bishop pair.'],
        ['Bxf6', 'White gives up the bishop.'],
        ['Qxf6', 'Recapture with the queen to keep your kingside pawns intact.'],
        ['Nd5', 'The knight hits the queen and c7.'],
        ['Qd8', 'The safest square: from d8 the queen guards c7.'],
        ['c3', 'Preparing b4 or d4 to harass your bishop.'],
        ['Ne7', 'Challenge the d5 knight. Once it is traded White\'s pressure disappears; then ...O-O and ...c6.'],
      ],
      summary: 'You have the bishop pair in a solid position. Trade the d5 knight, castle, play ...c6 and later ...d5. Keep the dark-squared bishop: it is your long-term trump.',
    },

    // =====================================================================
    // Italian: Evans Gambit
    // =====================================================================
    {
      id: 'evans-lasker',
      group: 'Italian 3.Bc4 Bc5: Evans Gambit',
      name: 'Evans Gambit, Lasker\'s Defence',
      weight: 4,
      trap: false,
      moves: [
        ...ITALIAN,
        ['b4', 'The Evans Gambit: a pawn for rapid development and a big centre after c3 and d4.'],
        ['Bxb4', 'Accept. Taking and returning the pawn at the right moment is the most reliable recipe.'],
        ['c3', 'Gaining time on the bishop and preparing d4.'],
        ['Ba5', 'From a5 the bishop eyes c3 and e1: once White plays d4, the c3 pawn is pinned and cannot recapture on d4. (5...Be7 is also fine.)'],
        ['d4', 'White builds the centre.'],
        ['d6', 'Lasker\'s idea: hold e5 with a pawn instead of grabbing on d4. Against 7.Qb3, defend f7 with 7...Qd7.'],
        ['O-O', 'White develops and keeps up the pressure.'],
        ['Bb6', 'Bring the bishop back to the a7-g1 diagonal, where it eyes d4 and f2 and cannot be cut off on a5.'],
        ['dxe5', 'White opens the d-file.'],
        ['dxe5', 'Recapture with the pawn and accept the queen trade.'],
        ['Qxd8+', 'White trades queens to regain the pawn. Without queens, the attack is gone.'],
        ['Nxd8', 'Recapture with the knight, not the king: you keep the right to castle and the knight can come to e6.'],
        ['Nxe5', 'White wins back the gambit pawn.'],
        ['Be6', 'Trade off White\'s best piece, the c4 bishop. You keep the bishop pair and White\'s isolated a- and c-pawns are long-term targets.'],
      ],
      summary: 'The gambit is neutralised in a queenless position. Develop with ...Nf6 and ...O-O, bring a rook to d8, and target White\'s weak a2 and c3 pawns.',
    },

    // =====================================================================
    // Ruy Lopez
    // =====================================================================
    {
      id: 'ruy-closed-chigorin',
      group: 'Ruy Lopez 3.Bb5 a6',
      name: 'Closed Ruy, 9.h3 Na5 (Chigorin)',
      weight: 8,
      trap: false,
      moves: [
        ...RUY_CLOSED,
        ['h3', 'Preventing ...Bg4 before playing d4.'],
        ['Na5', 'The Chigorin plan: chase the b3 bishop off the a2-g8 diagonal and free the c-pawn for ...c5.'],
        ['Bc2', 'The bishop keeps aiming at the kingside from c2.'],
        ['c5', 'Gain queenside space and pressure d4 before White plays it.'],
        ['d4', 'White finally takes the centre.'],
        ['Qc7', 'Defend e5 a second time and prepare ...cxd4 down the c-file. A classical, sturdy set-up.'],
        ['Nbd2', 'The knight heads for f1 and g3.'],
        ['cxd4', 'Open the c-file for your rooks before White can play d5 and close the position.'],
        ['cxd4', 'White recaptures, keeping a pawn on d4.'],
        ['Nc6', 'The knight returns to the centre with pressure on d4. Next ...Bd7, ...Rac8 and play down the c-file.'],
      ],
      summary: 'Classic Closed Ruy: pressure d4 with ...Nc6, the queen on c7 and rooks on the c-file. If White plays d5, re-route the knight via a5 or b4 and play on the queenside.',
    },
    {
      id: 'ruy-closed-d4',
      group: 'Ruy Lopez 3.Bb5 a6',
      name: 'Closed Ruy, 9.d4 Bg4',
      weight: 5,
      trap: false,
      moves: [
        ...RUY_CLOSED,
        ['d4', 'The immediate central strike, skipping h3.'],
        ['Bg4', 'Without h3, the pin is available: the f3 knight defends d4 and e5, so pinning it increases your pressure on the centre.'],
        ['Be3', 'Protecting d4.'],
        ['exd4', 'Release the tension so that c3 has to recapture; now the d4 pawn becomes a target.'],
        ['cxd4', 'White keeps the pawn duo on d4 and e4.'],
        ['Na5', 'Hit the b3 bishop and free the c-pawn.'],
        ['Bc2', 'The bishop retreats.'],
        ['c5', 'Undermine d4. Your pieces are active and White\'s centre is under fire.'],
      ],
      summary: 'Keep hitting d4: ...cxd4, ...Nc6 or ...Nc4, rooks to c8 and e8. The g4 bishop pins the knight that holds White\'s centre together.',
    },
    {
      id: 'ruy-exchange',
      group: 'Ruy Lopez 3.Bb5 a6',
      name: 'Exchange Variation, 5.O-O f6',
      weight: 6,
      trap: false,
      moves: [
        ...RUY_A6,
        ['Bxc6', 'The Exchange Variation: White gives up the bishop pair to damage your pawns.'],
        ['dxc6', 'Recapture with the d-pawn: it opens lines for your queen and c8 bishop. Doubled c-pawns are a fair price for two bishops.'],
        ['O-O', 'Now that White has castled, Nxe5 is a real threat.'],
        ['f6', 'Protect e5 solidly with a pawn. Your structure stays compact and the bishops come out next.'],
        ['d4', 'Opening the position.'],
        ['exd4', 'Take, then hit the knight.'],
        ['Nxd4', 'White recaptures with the knight.'],
        ['c5', 'Kick the knight and use your doubled pawn actively: c5 controls d4.'],
        ['Nb3', 'The knight retreats, offering the queen trade.'],
        ['Qxd1', 'Trade queens: with the bishop pair, the endgame is comfortable for you.'],
        ['Rxd1', 'Recapture.'],
        ['Bg4', 'Gain time on the d1 rook and provoke f3, which weakens e3 and the a7-g1 diagonal.'],
        ['f3', 'Blocking the attack on the rook.'],
        ['Be6', 'Re-route the bishop to e6, eyeing c4 and the b3 knight.'],
        ['Nc3', 'White develops.'],
        ['Bd6', 'Develop and guard c5 and e5. Next ...Ne7 and ...Kf7 or ...O-O-O; the bishop pair gives you a good endgame.'],
      ],
      summary: 'A queenless middlegame where your two bishops count. Develop with ...Ne7, bring your king to f7, and use the bishops on both wings.',
    },
    {
      id: 'ruy-delayed-exchange',
      group: 'Ruy Lopez 3.Bb5 a6',
      name: 'Delayed Exchange, 6.Bxc6',
      weight: 4,
      trap: false,
      moves: [
        ...RUY,
        ['Bxc6', 'A delayed exchange: White hopes to win e5 now that it has castled.'],
        ['dxc6', 'Recapture with the d-pawn, opening the queen and c8 bishop.'],
        ['d3', 'Protecting e4, so now Nxe5 really threatens to win a pawn.'],
        ['Nd7', 'The knight defends e5 and is heading for c5 or b6. Your bishops will enjoy the open diagonals.'],
        ['Nbd2', 'White brings the knight toward c4.'],
        ['O-O', 'Castle. Your king is safe; now finish your set-up.'],
        ['Nc4', 'The knight eyes e5 and a5.'],
        ['f6', 'Lock e5 with a pawn so the c4 knight has no target.'],
        ['Nh4', 'Heading for f5.'],
        ['Nc5', 'The knight finds a great square, eyeing e6 and d3. Next ...Ne6 and ...Rd8; the bishop pair promises a good long-term game.'],
      ],
      summary: 'Solid structure with e5 locked by ...f6. Re-route the knight to e6, put a rook on d8 and let the bishop pair work in the long run.',
    },

    // =====================================================================
    // Scotch & Scotch Gambit
    // =====================================================================
    {
      id: 'scotch-be3',
      group: 'Scotch & Scotch Gambit',
      name: 'Classical Scotch, 5.Be3 Qf6',
      weight: 5,
      trap: false,
      moves: [
        ...SCOTCH,
        ['Be3', 'Defending the knight.'],
        ['Qf6', 'A third attacker on d4. White has to keep defending, and f2 feels the pressure too.'],
        ['c3', 'Solidly supporting d4.'],
        ['Nge7', 'Develop the knight to e7, not f6, so the queen keeps the f-file and the knight can support ...d5 later.'],
        ['Bc4', 'White develops and eyes f7.'],
        ['Ne5', 'Hit the bishop. A knight on e5 is a monster in the centre.'],
        ['Be2', 'The bishop retreats.'],
        ['Qg6', 'A double attack on g2 and e4. White must spend time defending.'],
        ['O-O', 'g2 is now protected; e4 still needs care.'],
        ['d6', 'Calmly support the e5 knight and open the c8 bishop. Grabbing ...Qxe4 now walks into tactics against your king.'],
        ['f3', 'Protecting e4, but weakening the dark squares around White\'s king.'],
        ['O-O', 'Castle. Your pieces are active and ideas like ...d5 or ...Bh3 target the weakened kingside.'],
      ],
      summary: 'Active pieces and pressure on the dark squares. Use ...Bh3 or ...d5 ideas and keep the c5 bishop aimed at White\'s king.',
    },
    {
      id: 'scotch-nxc6',
      group: 'Scotch & Scotch Gambit',
      name: 'Classical Scotch, 5.Nxc6 Qf6',
      weight: 5,
      trap: false,
      moves: [
        ...SCOTCH,
        ['Nxc6', 'White swaps knights, hoping to damage your pawns.'],
        ['Qf6', 'The point: before recapturing, threaten ...Qxf2 mate. White must defend, and you recapture next move.'],
        ['Qd2', 'Defending f2. (6.Qf3 is the other try; then ...dxc6 or ...Qxf3 is equal.)'],
        ['dxc6', 'Recapture with the d-pawn: open lines for the queen and c8 bishop, and quick queenside castling.'],
        ['Nc3', 'White develops.'],
        ['Be6', 'Develop and control c4 and d5.'],
        ['Na4', 'Trying to trade off your strong bishop.'],
        ['Bd6', 'Keep the bishop. On d6 it is safe, supports ...Qe5 and eyes h2. Next ...Ne7 and ...O-O-O.'],
      ],
      summary: 'Fast development and active bishops. Castle long, centralise with ...Qe5 and ...Rhe8, and use the open d-file.',
    },
    {
      id: 'scotch-gambit-oo',
      group: 'Scotch & Scotch Gambit',
      name: 'Scotch Gambit, 5.O-O d6 6.c3 Bg4',
      weight: 4,
      trap: false,
      moves: [
        ...SCOTCH_GAMBIT,
        ['O-O', 'White castles, keeping the gambit spirit.'],
        ['d6', 'Solidly protect the c5 bishop and open the c8 bishop.'],
        ['c3', 'Offering a second pawn to open lines.'],
        ['Bg4', 'Pin the f3 knight and develop with pressure. Taking on c3 is possible but opens lines for White\'s pieces.'],
        ['Qb3', 'The big trick: the queen hits f7 and b7.'],
        ['Bxf3', 'Remove the knight first, so the attack on f7 loses a supporter. If 8.gxf3, White\'s kingside is wrecked.'],
        ['Bxf7+', 'White grabs f7 with check.'],
        ['Kf8', 'The right square. 8...Ke7 walks into more checks, and 8...Kd7?? gets mated.'],
        ['Bxg8', 'White takes the knight before recapturing on f3.'],
        ['Rxg8', 'Recapture. Material is now level.'],
        ['gxf3', 'White recaptures, but the king is badly exposed.'],
        ['g5', 'Material is level and White\'s king is open. Push ...g4 to open the g-file for your rook; your king will be safe on g7.'],
      ],
      summary: 'Level material, but White\'s kingside is shattered. Open the g-file with ...g4, bring the queen to h4 or f6, and tuck your king on g7.',
    },
    {
      id: 'scotch-gambit-c3',
      group: 'Scotch & Scotch Gambit',
      name: 'Scotch Gambit, 5.c3 Nf6 (Italian transposition)',
      weight: 3,
      trap: false,
      moves: [
        ...SCOTCH_GAMBIT,
        ['c3', 'Offering a second pawn, Danish style.'],
        ['Nf6', 'Develop and hit e4. This is exactly our Italian 4.c3 Nf6 5.d4 exd4, so the plans you know apply.'],
        ['e5', 'Kicking the knight.'],
        ['d5', 'The standard counter-strike: hit the c4 bishop, then plant your knight on e4.'],
      ],
      summary: 'Transposed to the Italian 6.e5 d5 line: ...Ne4 next, ...Bb6 when needed, and pressure on d4 with ...Bg4.',
    },

    // =====================================================================
    // Four Knights & Ponziani
    // =====================================================================
    {
      id: 'four-knights-spanish',
      group: 'Four Knights & Ponziani',
      name: 'Spanish Four Knights, Metger unpin',
      weight: 4,
      trap: false,
      moves: [
        ...FOUR_KNIGHTS,
        ['Bb5', 'The Spanish Four Knights.'],
        ['Bb4', 'Copy White. Your bishop pressures c3 and e4, and White has no way to exploit the symmetry yet.'],
        ['O-O', 'White castles.'],
        ['O-O', 'Castle too.'],
        ['d3', 'Protecting e4.'],
        ['d6', 'Protect e5 so that Bxc6 and Nxe5 is never a threat.'],
        ['Bg5', 'Now the f6 knight is pinned.'],
        ['Bxc3', 'Stop copying: 7...Bg4? 8.Bxf6 gxf6 wrecks your kingside. Take on c3 first and double White\'s pawns.'],
        ['bxc3', 'White gets the bishop pair but doubled c-pawns.'],
        ['Qe7', 'The Metger unpin: the queen leaves the pin and prepares ...Nd8-e6 to challenge the g5 bishop.'],
        ['Re1', 'White prepares d4.'],
        ['Nd8', 'Re-route the knight to e6.'],
        ['d4', 'White expands in the centre.'],
        ['Ne6', 'Hit the g5 bishop. The pin is broken for good, and White\'s doubled c-pawns are a long-term weakness.'],
      ],
      summary: 'The pin is gone and White has doubled c-pawns. Play ...c5 or ...Rd8, keep the centre closed and target the c-pawns in the long run.',
    },
    {
      id: 'four-knights-scotch',
      group: 'Four Knights & Ponziani',
      name: 'Scotch Four Knights, 5...Bb4',
      weight: 4,
      trap: false,
      moves: [
        ...FOUR_KNIGHTS,
        ['d4', 'The Scotch Four Knights.'],
        ['exd4', 'Take.'],
        ['Nxd4', 'White recaptures with the knight.'],
        ['Bb4', 'Pin the c3 knight and put pressure on e4.'],
        ['Nxc6', 'White trades knights.'],
        ['bxc6', 'Recapture toward the centre: the b-pawn supports the ...d5 break.'],
        ['Bd3', 'Protecting e4.'],
        ['d5', 'The freeing central break. Once it lands, you have full equality in the centre.'],
        ['exd5', 'White exchanges.'],
        ['cxd5', 'Recapture and keep a strong pawn on d5.'],
        ['O-O', 'White castles.'],
        ['O-O', 'Castle too.'],
        ['Bg5', 'Pinning the f6 knight.'],
        ['c6', 'Support d5 with a pawn. Your centre is rock-solid; next ...h6, ...Bd6 or ...Be7, and ...Rb8 against b2.'],
      ],
      summary: 'A solid, equal position. Your d5 pawn controls the centre; use the half-open b-file with ...Rb8 and break the pin with ...h6 or ...Be7.',
    },
    {
      id: 'ponziani-d5',
      group: 'Four Knights & Ponziani',
      name: 'Ponziani, 4.d4 Nxe4 5.d5 Bc5',
      weight: 2,
      trap: false,
      moves: [
        ...KNIGHTS,
        ['c3', 'The Ponziani: White prepares d4 with a pawn, but takes away c3 from the b1 knight.'],
        ['Nf6', 'Hit e4 straight away; without Nc3 it has no easy defender.'],
        ['d4', 'The main move.'],
        ['Nxe4', 'Take the pawn. After 5.d5 a tactical fight starts; 5.Bd3 or 5.dxe5 lead to normal play where you are fine.'],
        ['d5', 'Attacking the c6 knight.'],
        ['Bc5', 'Counter-attack! Instead of retreating, hit f2. If 6.dxc6 Bxf2+, White\'s king is dragged into the open.'],
        ['dxc6', 'White takes the knight.'],
        ['Bxf2+', 'Check, collecting a second pawn and stripping the king.'],
        ['Ke2', 'Forced: the king must move.'],
        ['Bb6', 'Keep the bishop. You have two pawns for the knight, White\'s king is stuck on e2, and your pieces are ready to attack.'],
        ['Qd5', 'Hitting the e4 knight and f7.'],
        ['Nf2', 'The knight escapes with tempo on the h1 rook.'],
        ['Rg1', 'Saving the rook.'],
        ['O-O', 'Castle to protect f7. With White\'s king on e2, ...e4, ...d6 and ...Qf6 give you a strong attack.'],
      ],
      summary: 'Two pawns and a raging attack for the piece. White\'s king on e2 cannot hide: open lines with ...e4 and ...d6 and bring the queen to f6 or h4.',
    },

    // =====================================================================
    // Vienna & Bishop's Opening
    // =====================================================================
    {
      id: 'vienna-gambit-nf3',
      group: 'Vienna & Bishop\'s Opening',
      name: 'Vienna Gambit, 5.Nf3 Be7',
      weight: 4,
      trap: false,
      moves: [
        ...VIENNA_GAMBIT,
        ['Nf3', 'The most solid follow-up.'],
        ['Be7', 'Calm development and preparing to castle. Your knight on e4 holds everything together.'],
        ['d4', 'White builds a centre.'],
        ['O-O', 'Castle first.'],
        ['Bd3', 'Hitting the e4 knight.'],
        ['f5', 'Support the knight with the f-pawn. If White takes en passant, your f8 rook gets an open file.'],
        ['exf6', 'White takes en passant.'],
        ['Bxf6', 'Recapture with the bishop: it now presses on d4.'],
        ['O-O', 'White castles.'],
        ['Nc6', 'Pile up on d4. Next ...Bg4 or ...Re8; you have easy development and the open f-file.'],
      ],
      summary: 'Free development and pressure on d4. Play ...Bg4, ...Re8 and ...Qd6, and use the open f-file. Your e4 knight is the cornerstone.',
    },
    {
      id: 'vienna-gambit-qf3',
      group: 'Vienna & Bishop\'s Opening',
      name: 'Vienna Gambit, 5.Qf3 Nc6',
      weight: 3,
      trap: false,
      moves: [
        ...VIENNA_GAMBIT,
        ['Qf3', 'Attacking the e4 knight and eyeing f7.'],
        ['Nc6', 'Develop with a threat: ...Nd4 hits the queen and c2. If 6.Nxe4, then 6...Nd4! is a strong in-between move.'],
        ['Bb5', 'Pinning the knight to stop ...Nd4.'],
        ['Nxc3', 'Trade the knight before White wins it.'],
        ['bxc3', 'White recaptures toward the centre.'],
        ['Qh4+', 'Check: White cannot castle and must block or offer a queen trade.'],
        ['g3', 'Blocking the check.'],
        ['Qe4+', 'Force the queens off.'],
        ['Qxe4', 'White trades.'],
        ['dxe4', 'Equal material, and your e4 pawn cramps White. Next ...Bd7, ...O-O-O and ...Bc5; the doubled c-pawns are a target.'],
      ],
      summary: 'A comfortable endgame. Castle long, put the bishop on c5, and attack White\'s doubled c-pawns while your e4 pawn cramps the kingside.',
    },
    {
      id: 'vienna-bc4-nd4',
      group: 'Vienna & Bishop\'s Opening',
      name: 'Vienna 3.Bc4 Bc5, 5.f4 d6 6.Nf3 Bg4',
      weight: 3,
      trap: false,
      moves: [
        ...VIENNA_BC4,
        ['h3', 'Asking the bishop.'],
        ['Bxf3', 'Take: the knight was the key defender of d4 and e5.'],
        ['Qxf3', 'White recaptures.'],
        ['Nd4', 'The knight leaps in with tempo, hitting the queen and c2. A typical ...Nd4 resource in these lines.'],
        ['Qg3', 'Hitting g7.'],
        ['O-O', 'Castle and keep g7 safe. Your d4 knight is excellent and you have pressure on c2 and f4.'],
      ],
      summary: 'Your knight on d4 dominates. Play ...c6 and ...d5 or ...exf4, keep pressure on c2 and f4, and use ...Nh5 to chase the queen.',
    },
    {
      id: 'bishops-opening-d3',
      group: 'Vienna & Bishop\'s Opening',
      name: 'Bishop\'s Opening, 2...Nf6 3.d3 Bc5',
      weight: 3,
      trap: false,
      moves: [
        ...E4E5,
        ['Bc4', 'The Bishop\'s Opening.'],
        ['Nf6', 'Hit e4, and stop Qh5 ideas against f7 before they start.'],
        ['d3', 'Protecting e4.'],
        ['Bc5', 'Our familiar set-up. After Nf3 and ...Nc6 you are back in the Italian.'],
        ['Nf3', 'Developing.'],
        ['Nc6', 'This is the Italian with 4.d3 Nf6.'],
        ['O-O', 'White castles.'],
        ['d6', 'Solid, as always in the quiet Italian.'],
        ['c3', 'Now it is the Giuoco Pianissimo.'],
        ['a6', 'Same plan as in the Pianissimo chapter: ...Ba7, ...O-O, ...h6 and ...Be6.'],
      ],
      summary: 'Transposed to the Giuoco Pianissimo. Continue with ...Ba7, ...O-O, ...h6, ...Re8 and ...Be6.',
    },

    // =====================================================================
    // King's Gambit
    // =====================================================================
    {
      id: 'kg-modern-bc4',
      group: 'King\'s Gambit 2.f4 exf4',
      name: 'Modern Defence, 5.Bc4 Nxd5',
      weight: 3,
      trap: false,
      moves: [
        ...KG_MODERN,
        ['Bc4', 'Developing and attacking d5.'],
        ['Nxd5', 'Recapture: the knight is centralised and blocks the c4 bishop\'s view of f7.'],
        ['O-O', 'White castles and eyes f7.'],
        ['Be7', 'Develop and castle quickly. The bishop also guards the kingside.'],
        ['d4', 'Preparing Bxf4.'],
        ['O-O', 'Castle. Your king is safe and f7 is covered by the rook.'],
        ['Bxd5', 'White trades the d5 knight.'],
        ['Qxd5', 'Recapture with the queen. It is centralised and hard to attack.'],
        ['Bxf4', 'White regains the pawn.'],
        ['c6', 'Material is level and you have the bishop pair and a sound structure. Next ...Nd7, ...Bf6 or ...Bf5.'],
      ],
      summary: 'Equal material, bishop pair and no weaknesses. Develop with ...Nd7-f6 and ...Bf5, and put pressure on the d4 pawn.',
    },
    {
      id: 'kg-modern-c4',
      group: 'King\'s Gambit 2.f4 exf4',
      name: 'Modern Defence, 5.c4 c6',
      weight: 2,
      trap: false,
      moves: [
        ...KG_MODERN,
        ['c4', 'Holding the d5 pawn with c4.'],
        ['c6', 'Undermine d5 at once; White\'s centre becomes a target.'],
        ['d4', 'Supporting the centre.'],
        ['Bb4+', 'Develop with check before recapturing; it disrupts White\'s development.'],
        ['Nc3', 'Blocking the check.'],
        ['cxd5', 'Recapture. White\'s centre is dissolving.'],
        ['Bxf4', 'White regains the pawn.'],
        ['O-O', 'Castle. The pin on c3 and pressure on d4 and c4 give you active, equal play.'],
      ],
      summary: 'Pressure White\'s centre: ...Nc6, ...Re8 and ...dxc4 or ...Ne4, using the pin on c3.',
    },
    {
      id: 'kg-bishops-gambit',
      group: 'King\'s Gambit 2.f4 exf4',
      name: 'Bishop\'s Gambit, 3.Bc4 Nf6',
      weight: 2,
      trap: false,
      moves: [
        ...KG,
        ['Bc4', 'The Bishop\'s Gambit.'],
        ['Nf6', 'Develop and hit e4; this also prepares ...c6 and ...d5.'],
        ['Nc3', 'Protecting e4.'],
        ['c6', 'Prepare ...d5 to blunt the c4 bishop.'],
        ['Bb3', 'Keeping the bishop on the diagonal.'],
        ['d5', 'Strike. The b3 bishop now bites on granite.'],
        ['exd5', 'White exchanges.'],
        ['cxd5', 'Recapture and keep a strong pawn on d5.'],
        ['d4', 'Fixing the centre.'],
        ['Bd6', 'Protect the f4 pawn and develop. You are a pawn up with a fine centre; castle next.'],
      ],
      summary: 'A pawn up with a solid centre. Castle, support f4 with ...g5 only if needed, and develop with ...Nc6 and ...Bg4.',
    },

    // =====================================================================
    // Centre Game & Danish
    // =====================================================================
    {
      id: 'centre-game',
      group: 'Centre Game & Danish',
      name: 'Centre Game, 3.Qxd4 Nc6',
      weight: 2,
      trap: false,
      moves: [
        ...CENTRE,
        ['Qxd4', 'The Centre Game: the queen recaptures early and will be harassed.'],
        ['Nc6', 'Gain time on the queen at once.'],
        ['Qe3', 'The usual retreat.'],
        ['Nf6', 'Develop and hit e4.'],
        ['Nc3', 'Protecting e4.'],
        ['Bb4', 'Pin the knight: e4 is now loosely defended.'],
        ['Bd2', 'Breaking the pin.'],
        ['O-O', 'Castle, then add the rook to the pressure on e4.'],
        ['O-O-O', 'White castles long and wants to attack.'],
        ['Re8', 'Pressure on e4. If 8.Qg3, then 8...Nxe4! wins the pawn.'],
        ['Bc4', 'White develops and defends.'],
        ['d6', 'Solid: stop e5 and free the c8 bishop.'],
        ['Nf3', 'White completes development.'],
        ['Be6', 'Trade off White\'s attacking bishop. Then ...Qe7 and ...a5-a4 or ...b5 against White\'s king.'],
      ],
      summary: 'Safe and active. Trade the c4 bishop, then attack White\'s queenside king with ...a5-a4, ...b5 and your rooks.',
    },
    {
      id: 'danish-d5',
      group: 'Centre Game & Danish',
      name: 'Danish Gambit, 3...d5',
      weight: 2,
      trap: false,
      moves: [
        ...CENTRE,
        ['c3', 'The Danish Gambit: White offers pawns for fast development.'],
        ['d5', 'Decline by striking in the centre. Accepting with ...dxc3 is possible, but ...d5 neutralises the gambit simply.'],
        ['exd5', 'White exchanges.'],
        ['Qxd5', 'The queen is safe in the centre: the c3 pawn takes the c3 square from White\'s knight.'],
        ['cxd4', 'White recaptures, left with an isolated d-pawn.'],
        ['Nc6', 'Develop with pressure on d4.'],
        ['Nf3', 'Defending d4.'],
        ['Bg4', 'Pin the defender of d4.'],
        ['Be2', 'Breaking the pin.'],
        ['Bb4+', 'Check to drag a piece to c3.'],
        ['Nc3', 'Blocking.'],
        ['Bxf3', 'Remove the defender of d4.'],
        ['Bxf3', 'White recaptures.'],
        ['Qc4', 'Hit d4 and stop White castling: the queen covers f1. The isolated d4 pawn is a lasting target.'],
      ],
      summary: 'White\'s king is stuck and d4 is weak. Pile up on d4 with ...Nge7, ...O-O-O and ...Rd8.',
    },

    // =====================================================================
    // Early queen: 2.Qh5
    // =====================================================================
    {
      id: 'qh5-ne2',
      group: 'Early queen: 2.Qh5',
      name: 'Wayward Queen, 5.Ne2 Bg7',
      weight: 3,
      trap: false,
      moves: [
        ...QH5,
        ['Ne2', 'The best set-up: the knight guards d4, so ...Nd4 tricks do not work.'],
        ['Bg7', 'Finish kingside development.'],
        ['Nbc3', 'White develops.'],
        ['d6', 'Solid: support e5 and open the c8 bishop.'],
        ['d3', 'Protecting e4.'],
        ['O-O', 'Castle. Next ...Na5 or ...Be6 to trade the c4 bishop, and ...Bg4 to hit the queen. The early queen achieved nothing.'],
      ],
      summary: 'You are well developed and safe. Trade the c4 bishop with ...Na5 or ...Be6, kick the queen with ...Bg4, and break with ...f5 or ...d5 later.',
    },
    {
      id: 'qh5-nc3-nd4',
      group: 'Early queen: 2.Qh5',
      name: 'Wayward Queen, 5.Nc3 Nd4',
      weight: 2,
      trap: false,
      moves: [
        ...QH5,
        ['Nc3', 'Natural but careless: now nothing covers d4.'],
        ['Nd4', 'Hit the queen and threaten ...Nxc2+, forking king and rook.'],
        ['Qd1', 'The queen has to go home.'],
        ['c6', 'Prepare ...d5 to take over the centre. The d4 knight is a monster, and White\'s queen trip has cost three tempi.'],
      ],
      summary: 'Big lead in development. Play ...d5, ...Bg7 and ...O-O; if the c4 bishop stays, ...d5 hits it with tempo.',
    },

    // =====================================================================
    // Traps & tricks
    // =====================================================================
    {
      id: 'trap-ng5-hangs',
      group: 'Traps & tricks',
      name: 'Fried Liver reflex: 4.Ng5?? Qxg5',
      weight: 3,
      trap: true,
      moves: [
        ...ITALIAN,
        ['Ng5', 'A Fried Liver reflex, but here it is a blunder: your queen on d8 sees g5 through the empty e7 and f6 squares.'],
        ['Qxg5', 'Just take it! The c1 bishop is still blocked by the d2 pawn, so nothing recaptures.'],
        ['d4', 'White hits the queen with the c1 bishop and the c5 bishop with the pawn.'],
        ['Qxg2', 'Take another pawn with tempo on the h1 rook; if 6.dxc5 Qxh1+. You are a piece and a pawn up with more to come.'],
      ],
      summary: 'With your bishop on c5, Ng5 drops a knight. Always check whether a square is guarded before reaching for a "standard" attacking move.',
    },
    {
      id: 'trap-fork-trick-italian',
      group: 'Traps & tricks',
      name: 'Fork trick: 4.Nxe5? Nxe5 5.d4 Bb4+',
      weight: 3,
      trap: true,
      moves: [
        ...ITALIAN,
        ['Nxe5', 'The fork trick: White gives up the knight, hoping d4 will fork c5 and e5.'],
        ['Nxe5', 'Take the knight. (If 5.Bxf7+, recapture 5...Nxf7 and you are two pieces up for two pawns.)'],
        ['d4', 'The fork.'],
        ['Bb4+', 'Escape with check! Not 5...Bxd4? 6.Qxd4, which hits e5 and g7 and wins the piece back.'],
        ['c3', 'Blocking the check.'],
        ['Nxc4', 'Take the bishop. After 7.cxb4 you are a knight for a pawn up.'],
      ],
      summary: 'Answer the fork with an in-between check. A whole knight up: develop with ...d5, ...Ne7 and ...O-O.',
    },
    {
      id: 'trap-fork-trick-four-knights',
      group: 'Traps & tricks',
      name: 'Fork trick: 4.Bc4 Bc5 5.Nxe5? Nxe5 6.d4 Nxc4',
      weight: 2,
      trap: true,
      moves: [
        ...FOUR_KNIGHTS,
        ['Bc4', 'The Italian Four Knights by another move order.'],
        ['Bc5', 'Back to our Italian set-up. (4...Nxe4 is also good, but stick with the familiar plan.)'],
        ['Nxe5', 'The fork trick again: White sacrifices on e5 hoping for d4.'],
        ['Nxe5', 'Take the knight.'],
        ['d4', 'The fork on c5 and e5.'],
        ['Nxc4', 'Take the bishop first. After 7.dxc5 you have won a piece for a pawn; 6...Bd6 would let White off the hook.'],
      ],
      summary: 'Grab the bishop with the attacked knight, then let the other piece go: you end up a knight for a pawn ahead.',
    },
    {
      id: 'trap-ng5-castled',
      group: 'Traps & tricks',
      name: 'Ng5 against the castled king',
      weight: 3,
      trap: true,
      moves: [
        ...ITALIAN,
        ['d3', 'Quiet development; now the c1 bishop does guard g5.'],
        ['Nf6', 'Develop and hit e4.'],
        ['Ng5', 'Eyeing f7 again.'],
        ['O-O', 'Simply castle: the rook now guards f7, so a sacrifice there loses material.'],
        ['Nxf7', 'The greedy sacrifice.'],
        ['Rxf7', 'Take.'],
        ['Bxf7+', 'White collects the rook.'],
        ['Kxf7', 'Two minor pieces for a rook and pawn: in the middlegame the two pieces are much stronger. Next ...d5 takes over the centre.'],
      ],
      summary: 'Two pieces for rook and pawn. Keep pieces on, play ...d5 and ...Kg8, and use your extra minor piece to attack.',
    },
    {
      id: 'trap-noahs-ark',
      group: 'Traps & tricks',
      name: 'Noah\'s Ark trap in the Ruy Lopez',
      weight: 2,
      trap: true,
      moves: [
        ...RUY_B5,
        ['d4', 'Premature: White has not prepared it with c3.'],
        ['Nxd4', 'Swap on d4 so White recaptures with the queen.'],
        ['Nxd4', 'White takes back.'],
        ['exd4', 'Take again.'],
        ['Qxd4', 'The natural recapture, and the mistake.'],
        ['c5', 'Hit the queen. Next ...c4 traps the b3 bishop, which has no retreat squares.'],
        ['Qd3', 'The queen steps away.'],
        ['c4', 'A fork of queen and bishop, and the bishop cannot escape. You win a piece.'],
      ],
      summary: 'The a6-b5-c4 pawn chain traps a bishop on b3. Remember the pattern whenever White plays d4 early in the Ruy.',
    },
    {
      id: 'trap-re1-bxf2',
      group: 'Traps & tricks',
      name: 'Italian: 5.O-O Nxe4 6.Re1?? Bxf2+',
      weight: 2,
      trap: true,
      moves: [
        ...GIUOCO,
        ['O-O', 'Castling, but e4 is now loose.'],
        ['Nxe4', 'Take it: e4 has no defender.'],
        ['Re1', 'Natural-looking, attacking the knight, but it fails tactically.'],
        ['Bxf2+', 'The king cannot take on f2 because your e4 knight guards that square.'],
        ['Kf1', 'The king steps aside.'],
        ['Bxe1', 'Win the rook. You are an exchange and two pawns up.'],
      ],
      summary: 'Before retreating an attacked knight, look for checks: here ...Bxf2+ deflects the king and wins the e1 rook.',
    },
    {
      id: 'trap-legal-vienna',
      group: 'Traps & tricks',
      name: 'Légal-style sacrifice: 7.Nxe5? dxe5',
      weight: 2,
      trap: true,
      moves: [
        ...VIENNA_BC4,
        ['Nxe5', 'A Légal-style queen offer: White hopes for 7...Bxd1 8.Bxf7+ Ke7 and a knight check on d5.'],
        ['dxe5', 'Take the knight. Your g4 bishop is guarded by the f6 knight (which also covers d5), so White just lost a piece. No need to calculate ...Bxd1 lines.'],
      ],
      summary: 'Before grabbing a queen, check what the opponent gets. Here the simple recapture wins a piece and keeps your bishop safe.',
    },
    {
      id: 'trap-qh5-g4',
      group: 'Traps & tricks',
      name: 'Wayward Queen: 5.g4? Nd4',
      weight: 2,
      trap: true,
      moves: [
        ...QH5,
        ['g4', 'A wild attempt to kick your f6 knight with g5.'],
        ['Nd4', 'Hit the queen; c2 is hanging with a fork of king and rook.'],
        ['Qd1', 'The queen retreats.'],
        ['d5', 'Open the centre while White\'s king is exposed. ...dxe4 or ...Nxg4 comes next, with a winning game.'],
      ],
      summary: 'When the queen sits on f3 with c2 unprotected, ...Nd4 is the key move. Then open the centre against White\'s weakened king.',
    },
  ],
};
