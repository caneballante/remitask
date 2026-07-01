# RemiTask Guidance

RemiTask has two app surfaces:

- `web/`: hosted Next.js app. This is the active RemiTask product.
- Root app: legacy local Python/SQLite browser app.

## Active App Surface

For all normal RemiTask feature work, bug fixes, UI changes, persistence changes, and deployed-site work, use `web/`.

Do not edit the root Python/SQLite app files (`server.py`, root `app.js`, root `index.html`, root `styles.css`, or `remitask.db`) unless the user explicitly asks for the legacy local app.

## First Diagnose The App Surface

Before debugging, identify whether the user means:

- Online/hosted app or normal RemiTask work: work in `web/`; persistence is Neon via `/api/state`.
- Legacy local app: work in repo root only when explicitly requested; persistence is `remitask.db` via `server.py`.

If the user says "online", "hosted", "website", "deployed", "Vercel", or just "RemiTask" without specifying legacy local, do not debug root `server.py`, `remitask.db`, or root `app.js` unless there is direct evidence the bug was copied from root into `web/`.

If the user says "legacy local", "SQLite", "Python app", or `127.0.0.1:8765`, do not debug `web/` unless asked.

## Root Python App

- Start the local app with `python server.py`.
- If port `8765` is busy, use `python server.py --port 8766`.
- Default local URL: `http://127.0.0.1:8765/`.
- The app stores live data in `remitask.db` next to the app files.
- AI extraction uses `OPENAI_API_KEY` from a root `.env`; do not read or print secret values.
- If no OpenAI key is present, the app should still work with the local rule-based extractor.

## Web App

- For hosted web work, change into `web/`.
- Use the existing `web/AGENTS.md` guidance before editing Next.js code.
- Common commands from `web/`:
  - `npm run lint`
  - `npm run build`
  - `npm run db:migrate`
- The web app expects `DATABASE_URL` in `web/.env.local`; do not read or print secret values.

## Verification

- For root app UI checks, start the Python server and verify the local URL in a browser.
- For web app checks, prefer lint/build first, then run the dev server only when a browser verification is useful.
- If a local port or environment variable is missing, report the specific blocker instead of trying unrelated ports or frameworks.
