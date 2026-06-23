# RemiTask

RemiTask is a lightweight browser app for turning meeting notes into an editable task dashboard.

Run the local SQLite-backed app:

```sh
python server.py
```

If port `8765` is already busy:

```sh
python server.py --port 8766
```

Then visit:

```text
http://127.0.0.1:8765/
```

Use the matching URL if you chose a different port, for example `http://127.0.0.1:8766/`.

## Current Storage

The app stores live data in `remitask.db`, a local SQLite database created next to the app files.

The browser also keeps a compatibility fallback in `localStorage` under:

```text
meeting-task-dashboard-v1
```

On first run, `server.py` imports `meeting-task-dashboard-2026-06-22.json` into SQLite if the database is empty. The app's `Export` and `Import` buttons still work as manual JSON backups.

## AI Task Extraction

`Extract Tasks` can use OpenAI from the local Python server. Create a `.env` file next to `server.py`:

```text
OPENAI_API_KEY=sk-your-api-key-here
```

Restart `python server.py` after adding the key. If no key is present, the app falls back to its local rule-based extractor.

## Main Features

- Meeting entry and editing
- Chronological meeting display by date/time
- `.ics` calendar import for meetings
- AI-backed meeting-note task extraction with local fallback
- Editable task dashboard
- Task views for Today, Next, Waiting, Projects, and Done
- JSON export/import backup
