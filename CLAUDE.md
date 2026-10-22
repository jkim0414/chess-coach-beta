# Chess Coach — notes for Claude

James is not a developer. Handle git, dependencies and deploys yourself; never ask him to run commands.

## Keep every copy current (do this without being asked)

There is exactly one source of truth: `main` on GitHub (`origin/main`). The live site follows it automatically.

- **Start of every session:** `git fetch origin`, then make sure your branch contains `origin/main`
  (merge it in if not), and run `npm install` — dependencies may have changed since your branch was cut.
- **Shipping a change:** run `npm test`, `npm run lint` and `npm run build`; commit; then fast-forward
  `origin/main` to your branch (`git push origin HEAD:main`). Merge `origin/main` first if the push is rejected.
- **After pushing:** bring James's own checkout up to date so it never goes stale:
  `git -C ~/Desktop/chess-app merge --ff-only origin/main && npm --prefix ~/Desktop/chess-app install`.
  If that checkout has uncommitted changes in files the merge touches, show James what they are and ask before discarding.
- **Deploys are automatic.** Vercel is connected to the GitHub repo: every push to `main` builds and
  deploys to production, and `https://chess-coach-beta.vercel.app` is a project domain that follows
  production. Don't run `vercel deploy` or `vercel alias set` — a manual alias pins the domain to one
  deployment and it stops updating. After a push, confirm with
  `npx vercel@latest inspect chess-coach-beta.vercel.app` that it serves the new deployment.

- **It's an installable PWA.** A service worker caches the app (and the engine) for offline play. After a
  deploy, open copies show "A new version of Chess Coach is ready — Update" within ~30 minutes or on next
  launch; tell James to tap Update rather than "refresh". Icons come from `public/pwa-icon.svg`
  (`npx pwa-assets-generator` regenerates the PNGs).

## Project

React 19 + Vite SPA; Stockfish 18 WASM in a Web Worker; all data in localStorage. See README.md for the
architecture. Product intent: teaching that transfers to real games — prefer features that make James
notice and recall things during play over showing answers.

- Tests run real Stockfish under Node (`test/nodeWorker.js`); `npm test` takes ~10 s.
- Opening content follows `src/data/courses/SCHEMA.md`; validate with `npm run validate:content:engine`.
- Browser-test with `npm run build` + `vite preview`: dev-server HMR reloads (and loses the live game)
  whenever files under `src/data` change.
