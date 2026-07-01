import { getSql } from "@/lib/db";
import type { AppState, Meeting, Task, Topic } from "@/lib/types";

type MeetingRow = {
  id: string;
  calendar_uid: string | null;
  title: string;
  project: string;
  date: DateValue;
  start_time: string;
  end_time: string;
  location: string;
  attendees: string;
  notes: string;
  created_at: DateValue;
  updated_at: DateValue;
};

type TaskRow = {
  id: string;
  title: string;
  project: string;
  status: Task["status"];
  priority: Task["priority"];
  effort: Task["effort"];
  energy: Task["energy"];
  context: Task["context"];
  owner: string;
  due: DateValue;
  notes: string;
  meeting_id: string | null;
  created_at: DateValue;
  completed_at: DateValue;
};

type TopicRow = {
  id: string;
  title: string;
  project: string;
  notes: string;
  created_at: DateValue;
  updated_at: DateValue;
};

type DateValue = string | Date | null;

export async function loadState(): Promise<AppState> {
  const sql = getSql();
  await ensureTopicsTable();
  const meetingRowsPromise = sql`
    select id, calendar_uid, title, project, date, start_time, end_time, location,
           attendees, notes, created_at, updated_at
    from meetings
    order by date desc nulls last, start_time desc, created_at desc
  ` as unknown as Promise<MeetingRow[]>;
  const taskRowsPromise = sql`
    select id, title, project, status, priority, effort, energy, context, owner,
           due, notes, meeting_id, created_at, completed_at
    from tasks
    order by created_at desc
  ` as unknown as Promise<TaskRow[]>;
  const topicRowsPromise = sql`
    select id, title, project, notes, created_at, updated_at
    from topics
    order by updated_at desc, created_at desc, title
  ` as unknown as Promise<TopicRow[]>;
  const [meetingRows, taskRows, topicRows] = await Promise.all([
    meetingRowsPromise,
    taskRowsPromise,
    topicRowsPromise,
  ]);

  return {
    meetings: meetingRows.map(meetingFromRow),
    tasks: taskRows.map(taskFromRow),
    topics: topicRows.map(topicFromRow),
    notes: [],
    imports: [],
  };
}

export async function saveState(state: AppState): Promise<AppState> {
  const sql = getSql();
  await ensureTopicsTable();
  const meetings = Array.isArray(state.meetings) ? state.meetings : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const topics = Array.isArray(state.topics) ? state.topics : [];

  await sql.transaction([
    sql`delete from topics`,
    sql`delete from tasks`,
    sql`delete from meetings`,
    ...meetings.map((meeting) => sql`
      insert into meetings (
        id, calendar_uid, title, project, date, start_time, end_time, location,
        attendees, notes, created_at, updated_at
      ) values (
        ${meeting.id},
        ${meeting.calendarUid || null},
        ${meeting.title || ""},
        ${meeting.project || ""},
        ${toDateOnly(meeting.date || null) || null},
        ${meeting.start || ""},
        ${meeting.end || ""},
        ${meeting.location || ""},
        ${meeting.attendees || ""},
        ${meeting.notes || ""},
        ${meeting.createdAt || new Date().toISOString()},
        ${meeting.updatedAt || new Date().toISOString()}
      )
    `),
    ...tasks.map((task) => sql`
      insert into tasks (
        id, title, project, status, priority, effort, energy, context, owner,
        due, notes, meeting_id, created_at, completed_at
      ) values (
        ${task.id},
        ${task.title || ""},
        ${task.project || ""},
        ${task.status || "Inbox"},
        ${task.priority || "P2"},
        ${task.effort || "Quick"},
        ${task.energy || "Normal"},
        ${task.context || "Follow-up"},
        ${task.owner || ""},
        ${toDateOnly(task.due || null) || null},
        ${task.notes || ""},
        ${task.meetingId || null},
        ${task.createdAt || new Date().toISOString()},
        ${task.completedAt || null}
      )
    `),
    ...topics.map((topic) => sql`
      insert into topics (
        id, title, project, notes, created_at, updated_at
      ) values (
        ${topic.id},
        ${topic.title || ""},
        ${topic.project || ""},
        ${topic.notes || ""},
        ${topic.createdAt || new Date().toISOString()},
        ${topic.updatedAt || new Date().toISOString()}
      )
    `),
  ]);

  return loadState();
}

function meetingFromRow(row: MeetingRow): Meeting {
  return {
    id: row.id,
    calendarUid: row.calendar_uid || "",
    title: row.title,
    project: row.project,
    date: toDateOnly(row.date),
    start: row.start_time,
    end: row.end_time,
    location: row.location,
    attendees: row.attendees,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    project: row.project,
    status: row.status,
    priority: row.priority,
    effort: row.effort,
    energy: row.energy,
    context: row.context,
    owner: row.owner,
    due: toDateOnly(row.due),
    notes: row.notes,
    meetingId: row.meeting_id || "",
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : "",
  };
}

function topicFromRow(row: TopicRow): Topic {
  return {
    id: row.id,
    title: row.title,
    project: row.project,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function ensureTopicsTable() {
  const sql = getSql();
  await sql`
    create table if not exists topics (
      id text primary key,
      title text not null default '',
      project text not null default '',
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists topics_project_idx on topics (project)`;
  await sql`create index if not exists topics_updated_at_idx on topics (updated_at)`;
}

function toIso(value: DateValue) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function toDateOnly(value: DateValue) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
}
