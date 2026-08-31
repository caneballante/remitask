import { getSql } from "@/lib/db";
import type {
  AppState,
  Meeting,
  MovableEntityKind,
  Space,
  StateChanges,
  Task,
  Topic,
  TopicPage,
} from "@/lib/types";

type DateValue = string | Date | null;

type MeetingRow = {
  id: string;
  space: Space;
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
  space: Space;
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
  updated_at: DateValue;
  completed_at: DateValue;
};

type TopicRow = {
  id: string;
  space: Space;
  title: string;
  project: string;
  notes: string;
  created_at: DateValue;
  updated_at: DateValue;
};

type TopicPageRow = {
  id: string;
  topic_id: string;
  title: string;
  notes: string;
  sort_order: number;
  created_at: DateValue;
  updated_at: DateValue;
};

let schemaPromise: Promise<void> | null = null;

export function isSpace(value: unknown): value is Space {
  return value === "work" || value === "personal";
}

export function isMovableEntityKind(value: unknown): value is MovableEntityKind {
  return value === "meeting" || value === "task" || value === "topic";
}

export async function loadState(space: Space): Promise<AppState> {
  const sql = getSql();
  await ensureSchema();
  const meetingRowsPromise = sql`
    select id, space, calendar_uid, title, project, date, start_time, end_time, location,
           attendees, notes, created_at, updated_at
    from meetings
    where space = ${space}
    order by date desc nulls last, start_time desc, created_at desc
  ` as unknown as Promise<MeetingRow[]>;
  const taskRowsPromise = sql`
    select id, space, title, project, status, priority, effort, energy, context, owner,
           due, notes, meeting_id, created_at, updated_at, completed_at
    from tasks
    where space = ${space}
    order by created_at desc
  ` as unknown as Promise<TaskRow[]>;
  const topicRowsPromise = sql`
    select id, space, title, project, notes, created_at, updated_at
    from topics
    where space = ${space}
    order by updated_at desc, created_at desc, title
  ` as unknown as Promise<TopicRow[]>;
  const topicPageRowsPromise = sql`
    select page.id, page.topic_id, page.title, page.notes, page.sort_order,
           page.created_at, page.updated_at
    from topic_pages page
    inner join topics topic on topic.id = page.topic_id
    where topic.space = ${space}
    order by page.topic_id, page.sort_order, page.created_at, page.id
  ` as unknown as Promise<TopicPageRow[]>;
  const [meetingRows, taskRows, topicRows, topicPageRows] = await Promise.all([
    meetingRowsPromise,
    taskRowsPromise,
    topicRowsPromise,
    topicPageRowsPromise,
  ]);
  const pagesByTopic = groupTopicPages(topicPageRows);

  return {
    meetings: meetingRows.map(meetingFromRow),
    tasks: taskRows.map(taskFromRow),
    topics: topicRows.map((topic) => topicFromRow(topic, pagesByTopic.get(topic.id) || [])),
    notes: [],
    imports: [],
  };
}

export async function applyStateChanges(space: Space, changes: StateChanges) {
  const sql = getSql();
  await ensureSchema();
  const meetings = changes.meetings?.upsert || [];
  const tasks = changes.tasks?.upsert || [];
  const topics = changes.topics?.upsert || [];
  const topicPages = topics.flatMap((topic) =>
    pagesForTopic(topic).map((page, sortOrder) => ({ topicId: topic.id, page, sortOrder })),
  );

  await sql.transaction([
    ...(changes.topics?.deleteIds || []).map((id) => sql`delete from topics where id = ${id} and space = ${space}`),
    ...(changes.tasks?.deleteIds || []).map((id) => sql`delete from tasks where id = ${id} and space = ${space}`),
    ...(changes.meetings?.deleteIds || []).map((id) => sql`delete from meetings where id = ${id} and space = ${space}`),
    ...meetings.map((meeting) => sql`
      insert into meetings (
        id, space, calendar_uid, title, project, date, start_time, end_time, location,
        attendees, notes, created_at, updated_at
      ) values (
        ${meeting.id}, ${meeting.space}, ${meeting.calendarUid || null}, ${meeting.title || ""},
        ${meeting.project || ""}, ${toDateOnly(meeting.date || null) || null}, ${meeting.start || ""},
        ${meeting.end || ""}, ${meeting.location || ""}, ${meeting.attendees || ""},
        ${meeting.notes || ""}, ${meeting.createdAt || new Date().toISOString()},
        ${meeting.updatedAt || new Date().toISOString()}
      )
      on conflict (id) do update set
        space = excluded.space, calendar_uid = excluded.calendar_uid, title = excluded.title,
        project = excluded.project, date = excluded.date, start_time = excluded.start_time,
        end_time = excluded.end_time, location = excluded.location, attendees = excluded.attendees,
        notes = excluded.notes, updated_at = excluded.updated_at
      where meetings.space = ${space}
    `),
    ...tasks.map((task) => sql`
      insert into tasks (
        id, space, title, project, status, priority, effort, energy, context, owner,
        due, notes, meeting_id, created_at, updated_at, completed_at
      ) values (
        ${task.id}, ${task.space}, ${task.title || ""}, ${task.project || ""},
        ${task.status || "Inbox"}, ${task.priority || "P2"}, ${task.effort || "Quick"},
        ${task.energy || "Normal"}, ${task.context || "Follow-up"}, ${task.owner || ""},
        ${toDateOnly(task.due || null) || null}, ${task.notes || ""}, ${task.meetingId || null},
        ${task.createdAt || new Date().toISOString()}, ${task.updatedAt || new Date().toISOString()},
        ${task.completedAt || null}
      )
      on conflict (id) do update set
        space = excluded.space, title = excluded.title, project = excluded.project,
        status = excluded.status, priority = excluded.priority, effort = excluded.effort,
        energy = excluded.energy, context = excluded.context, owner = excluded.owner,
        due = excluded.due, notes = excluded.notes, meeting_id = excluded.meeting_id,
        updated_at = excluded.updated_at, completed_at = excluded.completed_at
      where tasks.space = ${space}
    `),
    ...topics.map((topic) => sql`
      delete from topic_pages
      where topic_id = ${topic.id}
        and exists (select 1 from topics where id = ${topic.id} and space = ${space})
    `),
    ...topics.map((topic) => sql`
      insert into topics (id, space, title, project, notes, created_at, updated_at)
      values (
        ${topic.id}, ${topic.space}, ${topic.title || ""}, ${topic.project || ""},
        ${topic.notes || ""}, ${topic.createdAt || new Date().toISOString()},
        ${topic.updatedAt || new Date().toISOString()}
      )
      on conflict (id) do update set
        space = excluded.space, title = excluded.title, project = excluded.project,
        notes = excluded.notes, updated_at = excluded.updated_at
      where topics.space = ${space}
    `),
    ...topicPages.map(({ topicId, page, sortOrder }) => sql`
      insert into topic_pages (id, topic_id, title, notes, sort_order, created_at, updated_at)
      values (
        ${page.id}, ${topicId}, ${page.title || "Notes"}, ${page.notes || ""}, ${sortOrder},
        ${page.createdAt || new Date().toISOString()}, ${page.updatedAt || new Date().toISOString()}
      )
      on conflict (id) do update set
        title = excluded.title, notes = excluded.notes, sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
      where topic_pages.topic_id = ${topicId}
    `),
    sql`
      update tasks task
      set meeting_id = null, updated_at = now()
      where task.meeting_id is not null
        and not exists (
          select 1 from meetings meeting
          where meeting.id = task.meeting_id and meeting.space = task.space
        )
    `,
  ]);
}

export async function moveItem(
  kind: MovableEntityKind,
  id: string,
  sourceSpace: Space,
  targetSpace: Space,
  includeLinkedTasks = false,
) {
  if (sourceSpace === targetSpace) return;
  const sql = getSql();
  await ensureSchema();

  if (kind === "task") {
    await sql.transaction([
      sql`update tasks set space = ${targetSpace}, updated_at = now() where id = ${id} and space = ${sourceSpace}`,
      sql`
        update tasks task
        set meeting_id = null, updated_at = now()
        where task.id = ${id} and task.space = ${targetSpace} and task.meeting_id is not null
          and not exists (
            select 1 from meetings meeting
            where meeting.id = task.meeting_id and meeting.space = ${targetSpace}
          )
      `,
    ]);
    return;
  }

  if (kind === "meeting") {
    await sql.transaction([
      ...(includeLinkedTasks
        ? [sql`update tasks set space = ${targetSpace}, updated_at = now() where meeting_id = ${id} and space = ${sourceSpace}`]
        : [sql`update tasks set meeting_id = null, updated_at = now() where meeting_id = ${id} and space = ${sourceSpace}`]),
      sql`update meetings set space = ${targetSpace}, updated_at = now() where id = ${id} and space = ${sourceSpace}`,
    ]);
    return;
  }

  await sql`update topics set space = ${targetSpace}, updated_at = now() where id = ${id} and space = ${sourceSpace}`;
}

function meetingFromRow(row: MeetingRow): Meeting {
  return {
    id: row.id,
    space: row.space,
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
    space: row.space,
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
    updatedAt: toIso(row.updated_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : "",
  };
}

function topicFromRow(row: TopicRow, pages: TopicPage[]): Topic {
  const fallbackPage: TopicPage = {
    id: `${row.id}:notes`,
    title: "Notes",
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
  return {
    id: row.id,
    space: row.space,
    title: row.title,
    project: row.project,
    notes: row.notes,
    pages: pages.length ? pages : [fallbackPage],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = applySchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function applySchema() {
  const sql = getSql();
  await sql`
    create table if not exists topics (
      id text primary key,
      space text not null default 'work',
      title text not null default '',
      project text not null default '',
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists topic_pages (
      id text primary key,
      topic_id text not null references topics(id) on delete cascade,
      title text not null default 'Notes',
      notes text not null default '',
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table meetings add column if not exists space text not null default 'work'`;
  await sql`alter table tasks add column if not exists space text not null default 'work'`;
  await sql`alter table tasks add column if not exists updated_at timestamptz not null default now()`;
  await sql`alter table topics add column if not exists space text not null default 'work'`;
  await sql`create index if not exists meetings_space_date_idx on meetings (space, date)`;
  await sql`create index if not exists tasks_space_status_idx on tasks (space, status)`;
  await sql`create index if not exists tasks_space_due_idx on tasks (space, due)`;
  await sql`create index if not exists topics_space_updated_at_idx on topics (space, updated_at)`;
  await sql`create index if not exists topic_pages_topic_id_idx on topic_pages (topic_id, sort_order)`;
}

function groupTopicPages(rows: TopicPageRow[]) {
  const grouped = new Map<string, TopicPage[]>();
  rows.forEach((row) => {
    const pages = grouped.get(row.topic_id) || [];
    pages.push({
      id: row.id,
      title: row.title,
      notes: row.notes,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    });
    grouped.set(row.topic_id, pages);
  });
  return grouped;
}

function pagesForTopic(topic: Topic): TopicPage[] {
  if (Array.isArray(topic.pages) && topic.pages.length) return topic.pages;
  return [{
    id: `${topic.id}:notes`,
    title: "Notes",
    notes: topic.notes || "",
    createdAt: topic.createdAt || new Date().toISOString(),
    updatedAt: topic.updatedAt || new Date().toISOString(),
  }];
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
