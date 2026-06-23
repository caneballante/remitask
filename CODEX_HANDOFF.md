# Codex Handoff: RemiTask

## Purpose

RemiTask is a prototype task dashboard for Jon. The core workflow is:

1. Capture or import meetings.
2. Add notes to meetings.
3. Extract suggested tasks from meeting notes.
4. Review/edit suggested tasks before adding them.
5. Work from clean views: Today, Next, Waiting, Projects, Done.

The app was built because Google Docs became hard to scan visually. The goal is a low-friction system that helps Jon trust that work is captured without showing everything at once.

## Current App Shape

This is now a local-first browser app backed by SQLite:

- `index.html`
- `styles.css`
- `app.js`
- `server.py`
- `remitask.db` after first run
- `meeting-task-dashboard-2026-06-22.json`

There is no build step and no package manager yet. The server uses only Python standard-library modules.

To run locally:

```sh
python server.py
```

If port `8765` is already busy:

```sh
python server.py --port 8766
```

Open:

```text
http://127.0.0.1:8765/
```

Use the matching URL if you chose a different port, for example `http://127.0.0.1:8766/`.

Opening `index.html` directly can work for normal use, but serving over localhost is easier for browser verification and future file/API work.

## Current Data Storage

Live data is stored in local SQLite:

```text
remitask.db
```

The browser also keeps a compatibility fallback in `localStorage`:

```text
meeting-task-dashboard-v1
```

Current state shape:

```json
{
  "tasks": [],
  "meetings": [],
  "notes": [],
  "imports": []
}
```

The JSON file in the repo, `meeting-task-dashboard-2026-06-22.json`, is the exported data backup from Jon's current browser. On the new machine, import it with the app's `Import` button.

On first run, `server.py` imports `meeting-task-dashboard-2026-06-22.json` if the database is empty. The app still supports JSON Export/Import for manual backups.

## AI Task Extraction

`Extract Tasks` now calls the local server endpoint:

```text
POST /api/extract-tasks
```

The endpoint uses OpenAI's Responses API when `OPENAI_API_KEY` is set in the environment or in a local `.env` file. Optional:

```text
OPENAI_MODEL=gpt-4o-mini
```

If OpenAI is not configured or the API request fails, the browser falls back to the rule-based extractor.

## Recommended Next Storage Step

The first durable local storage step is implemented as **SQLite + a tiny Python server**. Future storage work can focus on backup automation, conflict handling, or hosted sync if cross-device access becomes important.

## Important UX Decisions Already Made

- Meetings are first-class records, separate from tasks.
- Meeting notes live on meetings.
- Tasks can link back to `meetingId`.
- Calendar `.ics` import creates/updates meetings only. It does not create tasks automatically.
- `Extract Tasks` should be treated as a deliberate action after notes exist.
- Re-imported `.ics` events dedupe by `calendarUid`.
- The meeting `Edit` button now scrolls/focuses the form and shows `Loaded: [meeting]`.
- `New Meeting` clears the form and makes add mode obvious.

## Task Fields

Tasks currently use:

- `id`
- `title`
- `project`
- `status`: Inbox, Today, Next, Waiting, Scheduled, Done, Someday
- `priority`: P1, P2, P3
- `effort`: Quick, Medium, Deep
- `energy`: Low-focus, Normal, High-focus
- `context`: Email, Meeting, Writing, Website, Design, Follow-up, Admin
- `owner`
- `due`
- `notes`
- `meetingId`
- `createdAt`

Meeting records currently use:

- `id`
- `calendarUid`
- `title`
- `project`
- `date`
- `start`
- `end`
- `location`
- `attendees`
- `notes`
- `createdAt`

## Existing Imported Data

The app includes a hardcoded migration from Jon's Google Doc notes:

- 10 meetings from June 17 and June 18, 2026
- imported Next/Waiting tasks from the processed dashboard
- cleanup migration for verification test rows

This is in `app.js` as `importedDocMeetings`, `importedDocTasks`, and migration version constants.

Once durable storage is implemented, consider moving seed/import data out of app code.

## Known Limitations

- localStorage is the biggest risk.
- Extracting tasks is AI-backed when `OPENAI_API_KEY` is configured, with a rule-based fallback.
- There is no duplicate protection yet when extracting tasks from the same meeting multiple times and adding selected suggestions again.
- There is no conflict handling or sync.
- `.ics` import covers common calendar exports but has not been tested against every provider.
- No automated test suite yet.

## Suggested Next Work

1. Add duplicate protection for extracted tasks by meeting/task title.
2. Move Google Doc import seed data out of `app.js`.
3. Add a one-click database backup/export flow.
4. Consider adding a simple "Daily Plan" builder that chooses:
   - 1 Deep task
   - 2 Medium tasks
   - 3 Quick tasks
   - waiting-list review
