# Contributing

Use a feature branch and a focused pull request. Install with `npm ci`, configure `.env` from `.env.example`, and run `npm run dev`.

Before a PR, run `npm test`, `npm run format:check`, `npm run build` and `npm run test:e2e` after installing Chromium. Include the behaviour changed and the checks run. Never include credentials, `.env`, generated builds or browser traces in commits.

Keep API logic in `api/` so local and Vercel execution cannot drift. New protected routes must use `withSession`; test missing sessions, malformed requests and provider failures. Never weaken authentication to make a test pass. Use fake providers for automated checks and do not publish real posts during tests.
