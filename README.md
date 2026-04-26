# Chess Coach

A browser-based chess coaching app. Play against Stockfish at adjustable skill levels, then get plain-English explanations of the top candidate moves in any position — including tactical patterns (forks, pins, discovered attacks, threats), opening identification, and forcing-continuation idea lines.

Live: https://chess-coach-beta.vercel.app

## How it works

- **Engine**: [Stockfish 18](https://stockfishchess.org/) compiled to WASM, running in a Web Worker so the UI stays responsive.
- **Analysis**: MultiPV evaluation surfaces the top candidate moves; each is annotated with the resulting tactical motifs and a short forcing line.
- **Game logic**: [chess.js](https://github.com/jhlywa/chess.js) for move validation, FEN/PGN, and game-state tracking.
- **UI**: [react-chessboard](https://github.com/Clariity/react-chessboard) on top of React 19.

The app is fully client-side — no server, no backend, no analysis API calls. Everything runs in your browser.

## Local development

```bash
npm install
npm run dev      # vite dev server
npm run build    # produces dist/
npm run preview  # preview the production build
```

Node 18+ required.

## Deployment

Deployed as a static site on Vercel. The `vercel.json` sets `Cross-Origin-Opener-Policy: same-origin` (required for the Stockfish Web Worker) and points the build at `dist/`.

The legacy `server.js` (Express) was used for the prior Railway deploy and is no longer needed for Vercel — kept for reference.
