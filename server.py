from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "remitask.db"
BACKUP_PATH = ROOT / "meeting-task-dashboard-2026-06-22.json"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
TASK_STATUSES = {"Inbox", "Today", "Next", "Waiting", "Scheduled", "Done", "Someday"}
TASK_PRIORITIES = {"P1", "P2", "P3"}
TASK_EFFORTS = {"Quick", "Medium", "Deep"}
TASK_ENERGIES = {"Low-focus", "Normal", "High-focus"}
TASK_CONTEXTS = {"Email", "Meeting", "Writing", "Website", "Design", "Follow-up", "Admin"}


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
              id TEXT PRIMARY KEY,
              position INTEGER NOT NULL,
              title TEXT NOT NULL DEFAULT '',
              project TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT '',
              priority TEXT NOT NULL DEFAULT '',
              effort TEXT NOT NULL DEFAULT '',
              energy TEXT NOT NULL DEFAULT '',
              context TEXT NOT NULL DEFAULT '',
              owner TEXT NOT NULL DEFAULT '',
              due TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '',
              meeting_id TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT '',
              data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meetings (
              id TEXT PRIMARY KEY,
              position INTEGER NOT NULL,
              calendar_uid TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL DEFAULT '',
              project TEXT NOT NULL DEFAULT '',
              date TEXT NOT NULL DEFAULT '',
              start TEXT NOT NULL DEFAULT '',
              end TEXT NOT NULL DEFAULT '',
              location TEXT NOT NULL DEFAULT '',
              attendees TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT '',
              data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notes (
              id TEXT PRIMARY KEY,
              position INTEGER NOT NULL,
              data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS imports (
              import_key TEXT PRIMARY KEY,
              position INTEGER NOT NULL
            );
            """
        )

        has_data = conn.execute(
            "SELECT EXISTS(SELECT 1 FROM tasks) OR EXISTS(SELECT 1 FROM meetings)"
        ).fetchone()[0]

    if not has_data and BACKUP_PATH.exists():
        save_state(json.loads(BACKUP_PATH.read_text(encoding="utf-8")))


def clean_text(value: object) -> str:
    return value if isinstance(value, str) else ""


def ensure_list(value: object) -> list:
    return value if isinstance(value, list) else []


def normalize_state(state: object) -> dict:
    if not isinstance(state, dict):
        raise ValueError("State must be a JSON object.")

    tasks = [item for item in ensure_list(state.get("tasks")) if isinstance(item, dict)]
    meetings = [item for item in ensure_list(state.get("meetings")) if isinstance(item, dict)]
    notes = [item for item in ensure_list(state.get("notes")) if isinstance(item, dict)]
    imports = [item for item in ensure_list(state.get("imports")) if isinstance(item, str)]
    return {"tasks": tasks, "meetings": meetings, "notes": notes, "imports": imports}


def load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def extract_tasks_with_openai(payload: object) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set.")

    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    meeting = payload.get("meeting") if isinstance(payload.get("meeting"), dict) else {}
    projects = ensure_list(payload.get("projects"))
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    prompt_payload = {
        "meeting": {
            "title": clean_text(meeting.get("title")),
            "project": clean_text(meeting.get("project")),
            "date": clean_text(meeting.get("date")),
            "attendees": clean_text(meeting.get("attendees")),
            "notes": clean_text(meeting.get("notes")),
        },
        "knownProjects": [project for project in projects if isinstance(project, str)],
    }

    body = {
        "model": model,
        "input": [
            {
                "role": "developer",
                "content": (
                    "Extract actionable task suggestions from meeting notes for a personal task dashboard. "
                    "Infer implied tasks from context, but do not invent unrelated work. "
                    "Return concise task titles. Use an existing known project when it fits; otherwise use the meeting project or Inbox. "
                    "Use due as YYYY-MM-DD only when the notes clearly state a date; otherwise use an empty string. "
                    "Use Waiting only for items owned by someone else."
                ),
            },
            {"role": "user", "content": json.dumps(prompt_payload, ensure_ascii=False)},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "meeting_task_suggestions",
                "strict": True,
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["tasks"],
                    "properties": {
                        "tasks": {
                            "type": "array",
                            "maxItems": 12,
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": [
                                    "title",
                                    "project",
                                    "status",
                                    "priority",
                                    "effort",
                                    "energy",
                                    "context",
                                    "owner",
                                    "due",
                                    "notes",
                                ],
                                "properties": {
                                    "title": {"type": "string"},
                                    "project": {"type": "string"},
                                    "status": {"type": "string", "enum": sorted(TASK_STATUSES)},
                                    "priority": {"type": "string", "enum": sorted(TASK_PRIORITIES)},
                                    "effort": {"type": "string", "enum": sorted(TASK_EFFORTS)},
                                    "energy": {"type": "string", "enum": sorted(TASK_ENERGIES)},
                                    "context": {"type": "string", "enum": sorted(TASK_CONTEXTS)},
                                    "owner": {"type": "string"},
                                    "due": {"type": "string"},
                                    "notes": {"type": "string"},
                                },
                            },
                        }
                    },
                },
            }
        },
        "max_output_tokens": 2000,
    }

    openai_request = request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(openai_request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI request failed with {exc.code}: {detail}") from exc

    parsed = json.loads(extract_response_text(result))
    tasks = parsed.get("tasks") if isinstance(parsed, dict) else []
    if not isinstance(tasks, list):
        tasks = []

    return {
        "source": "openai",
        "model": model,
        "tasks": [normalize_ai_task(task, meeting) for task in tasks if isinstance(task, dict)],
    }


def extract_response_text(result: dict) -> str:
    if isinstance(result.get("output_text"), str):
        return result["output_text"]

    texts = []
    for item in ensure_list(result.get("output")):
        if not isinstance(item, dict):
            continue
        for content in ensure_list(item.get("content")):
            if isinstance(content, dict) and isinstance(content.get("text"), str):
                texts.append(content["text"])
    if not texts:
        raise RuntimeError("OpenAI response did not include text output.")
    return "\n".join(texts)


def normalize_ai_task(task: dict, meeting: dict) -> dict:
    status = clean_text(task.get("status")) or "Next"
    priority = clean_text(task.get("priority")) or "P2"
    effort = clean_text(task.get("effort")) or "Quick"
    energy = clean_text(task.get("energy")) or "Normal"
    context = clean_text(task.get("context")) or "Follow-up"
    return {
        "selected": True,
        "title": clean_text(task.get("title")).strip(),
        "project": clean_text(task.get("project")) or clean_text(meeting.get("project")) or "Inbox",
        "status": status if status in TASK_STATUSES else "Next",
        "priority": priority if priority in TASK_PRIORITIES else "P2",
        "effort": effort if effort in TASK_EFFORTS else "Quick",
        "energy": energy if energy in TASK_ENERGIES else "Normal",
        "context": context if context in TASK_CONTEXTS else "Follow-up",
        "owner": clean_text(task.get("owner")) or ("Jon" if status != "Waiting" else ""),
        "due": clean_text(task.get("due")),
        "notes": clean_text(task.get("notes")),
        "meetingId": clean_text(meeting.get("id")),
    }


def load_state() -> dict:
    with connect() as conn:
        tasks = [
            json.loads(row["data"])
            for row in conn.execute("SELECT data FROM tasks ORDER BY position, created_at, title")
        ]
        meetings = [
            json.loads(row["data"])
            for row in conn.execute("SELECT data FROM meetings ORDER BY position, date, start, title")
        ]
        notes = [
            json.loads(row["data"])
            for row in conn.execute("SELECT data FROM notes ORDER BY position")
        ]
        imports = [
            row["import_key"]
            for row in conn.execute("SELECT import_key FROM imports ORDER BY position")
        ]
    return {"tasks": tasks, "meetings": meetings, "notes": notes, "imports": imports}


def save_state(raw_state: object) -> dict:
    state = normalize_state(raw_state)
    with connect() as conn:
        conn.execute("BEGIN")
        conn.execute("DELETE FROM tasks")
        conn.execute("DELETE FROM meetings")
        conn.execute("DELETE FROM notes")
        conn.execute("DELETE FROM imports")

        for position, task in enumerate(state["tasks"]):
            task_id = clean_text(task.get("id"))
            if not task_id:
                continue
            conn.execute(
                """
                INSERT INTO tasks (
                  id, position, title, project, status, priority, effort, energy,
                  context, owner, due, notes, meeting_id, created_at, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task_id,
                    position,
                    clean_text(task.get("title")),
                    clean_text(task.get("project")),
                    clean_text(task.get("status")),
                    clean_text(task.get("priority")),
                    clean_text(task.get("effort")),
                    clean_text(task.get("energy")),
                    clean_text(task.get("context")),
                    clean_text(task.get("owner")),
                    clean_text(task.get("due")),
                    clean_text(task.get("notes")),
                    clean_text(task.get("meetingId")),
                    clean_text(task.get("createdAt")),
                    json.dumps(task, ensure_ascii=False),
                ),
            )

        for position, meeting in enumerate(state["meetings"]):
            meeting_id = clean_text(meeting.get("id"))
            if not meeting_id:
                continue
            conn.execute(
                """
                INSERT INTO meetings (
                  id, position, calendar_uid, title, project, date, start, end,
                  location, attendees, notes, created_at, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    meeting_id,
                    position,
                    clean_text(meeting.get("calendarUid")),
                    clean_text(meeting.get("title")),
                    clean_text(meeting.get("project")),
                    clean_text(meeting.get("date")),
                    clean_text(meeting.get("start")),
                    clean_text(meeting.get("end")),
                    clean_text(meeting.get("location")),
                    clean_text(meeting.get("attendees")),
                    clean_text(meeting.get("notes")),
                    clean_text(meeting.get("createdAt")),
                    json.dumps(meeting, ensure_ascii=False),
                ),
            )

        for position, note in enumerate(state["notes"]):
            note_id = clean_text(note.get("id"))
            if not note_id:
                continue
            conn.execute(
                "INSERT INTO notes (id, position, data) VALUES (?, ?, ?)",
                (note_id, position, json.dumps(note, ensure_ascii=False)),
            )

        for position, import_key in enumerate(state["imports"]):
            conn.execute(
                "INSERT OR REPLACE INTO imports (import_key, position) VALUES (?, ?)",
                (import_key, position),
            )

        conn.commit()
    return load_state()


class RemiTaskHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.write_json({"ok": True, "database": str(DB_PATH)})
            return
        if parsed.path == "/api/state":
            self.write_json(load_state())
            return
        super().do_GET()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/state":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8")
            state = json.loads(body)
            self.write_json(save_state(state))
        except (json.JSONDecodeError, ValueError) as error:
            self.write_json({"error": str(error)}, status=400)
        except Exception as error:
            self.write_json({"error": f"Unable to save state: {error}"}, status=500)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/extract-tasks":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body)
            self.write_json(extract_tasks_with_openai(payload))
        except json.JSONDecodeError as error:
            self.write_json({"error": str(error)}, status=400)
        except ValueError as error:
            self.write_json({"error": str(error)}, status=503)
        except Exception as error:
            self.write_json({"error": str(error)}, status=502)

    def write_json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local RemiTask server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    args = parser.parse_args()

    load_env_file()
    mimetypes.add_type("text/javascript", ".js")
    init_db()
    server = ThreadingHTTPServer((args.host, args.port), RemiTaskHandler)
    print(f"RemiTask running at http://{args.host}:{args.port}/")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
