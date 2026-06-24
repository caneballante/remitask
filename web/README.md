# RemiTask Web

This is the hosted Next.js rebuild of RemiTask. It uses Neon Postgres for durable meeting and task storage and keeps the local SQLite app separate.

## Local Setup

Create `web/.env.local`:

```text
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
OPENAI_API_KEY=sk-your-api-key-here
APP_PASSWORD=choose-a-private-app-password
# Optional:
# OPENAI_MODEL=gpt-4o-mini
```

Run the database migration:

```sh
npm run db:migrate
```

Start the app:

```sh
npm run dev
```

Open:

```text
http://localhost:3000
```

## Checks

```sh
npm run lint
npm run build
```

`/api/health` verifies the Neon connection. `/api/state` and `/api/extract-tasks` are protected when `APP_PASSWORD` is set.

## Current Web Features

- Dashboard with meetings and Today tasks
- Meeting editor modal with simple note formatting and preview
- Meeting list with expandable formatted notes
- ICS import that strips calendar descriptions and preserves manual notes on re-import
- JSON import/export for migration and backups
- Task views for Today, Next, Waiting, Projects, and Done
- Completed tasks stay visible on the dashboard for the day they were checked off
- OpenAI task extraction with local fallback in the client
