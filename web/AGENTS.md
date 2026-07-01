<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RemiTask Web Guidance

This is the hosted Next.js app and the active RemiTask product. Use this surface for normal RemiTask work, online/deployed website work, and Vercel bugs.

Do not edit the root legacy Python/SQLite app (`server.py`, root `app.js`, root `index.html`, root `styles.css`, or `remitask.db`) unless the user explicitly asks for the legacy local app.

## Persistence Path

Meeting, task, and topic state flows through:

`web/src/components/remitask-app.tsx` -> `/api/state` -> `web/src/lib/state-db.ts` -> Neon Postgres.

For bugs where data appears temporarily but disappears after reload, inspect whether the client awaited `/api/state` and whether `state-db.ts` writes and loads that entity. Do not inspect root `remitask.db`, root `server.py`, or root `app.js` for hosted persistence bugs unless there is direct evidence the bug was copied between app surfaces.

## Verification Order

Prefer:

1. `npm run lint`
2. `npm run build`
3. Browser/dev-server verification only when the behavior is visual, interactive, auth-related, or not covered by build/lint.

Use `npm run dev` from `web/` and the documented default URL `http://localhost:3000`. Before trying random ports, inspect project docs, package scripts, existing terminal output, or whether port `3000` is already listening.

## Environment

`web/.env.local` may contain `DATABASE_URL`, `OPENAI_API_KEY`, and `APP_PASSWORD`. Do not read or print secret values. If a check fails because an environment variable is missing, report that specific blocker instead of trying unrelated storage backends.
