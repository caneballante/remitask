import { getSql } from "@/lib/db";
import type { AppState, Meeting, Task } from "@/lib/types";

type MeetingRow = {
  id: string;
  calendar_uid: string | null;
  title: string;
  project: string;
  date: string | null;
  start_time: string;
  end_time: string;
  location: string;
  attendees: string;
  notes: string;
  created_at: string;
  updated_at: string;
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
  due: string | null;
  notes: string;
  meeting_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function loadState(): Promise<AppState> {
  const sql = getSql();
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
  const [meetingRows, taskRows] = await Promise.all([
    meetingRowsPromise,
    taskRowsPromise,
  ]);

  return {
    meetings: meetingRows.map(meetingFromRow),
    tasks: taskRows.map(taskFromRow),
    notes: [],
    imports: [],
  };
}

export async function saveState(state: AppState): Promise<AppState> {
  const sql = getSql();
  const meetings = Array.isArray(state.meetings) ? state.meetings : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];

  await sql.transaction([
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
        ${meeting.date || null},
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
        ${task.due || null},
        ${task.notes || ""},
        ${task.meetingId || null},
        ${task.createdAt || new Date().toISOString()},
        ${task.completedAt || null}
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
    date: row.date || "",
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
    due: row.due || "",
    notes: row.notes,
    meetingId: row.meeting_id || "",
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : "",
  };
}

function toIso(value: string) {
  return new Date(value).toISOString();
}
