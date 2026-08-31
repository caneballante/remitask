create table if not exists meetings (
  id text primary key,
  space text not null default 'work' check (space in ('work', 'personal')),
  calendar_uid text,
  title text not null default '',
  project text not null default '',
  date date,
  start_time text not null default '',
  end_time text not null default '',
  location text not null default '',
  attendees text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table meetings add column if not exists space text not null default 'work';

create index if not exists meetings_date_idx on meetings (date);
create index if not exists meetings_calendar_uid_idx on meetings (calendar_uid);
create index if not exists meetings_space_date_idx on meetings (space, date);

create table if not exists tasks (
  id text primary key,
  space text not null default 'work' check (space in ('work', 'personal')),
  title text not null default '',
  project text not null default '',
  status text not null default 'Inbox',
  priority text not null default 'P2',
  effort text not null default 'Quick',
  energy text not null default 'Normal',
  context text not null default 'Follow-up',
  owner text not null default '',
  due date,
  notes text not null default '',
  meeting_id text references meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table tasks add column if not exists space text not null default 'work';
alter table tasks add column if not exists updated_at timestamptz not null default now();

create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_due_idx on tasks (due);
create index if not exists tasks_meeting_id_idx on tasks (meeting_id);
create index if not exists tasks_space_status_idx on tasks (space, status);
create index if not exists tasks_space_due_idx on tasks (space, due);

create table if not exists topics (
  id text primary key,
  space text not null default 'work' check (space in ('work', 'personal')),
  title text not null default '',
  project text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table topics add column if not exists space text not null default 'work';

create index if not exists topics_project_idx on topics (project);
create index if not exists topics_updated_at_idx on topics (updated_at);
create index if not exists topics_space_updated_at_idx on topics (space, updated_at);

create table if not exists topic_pages (
  id text primary key,
  topic_id text not null references topics(id) on delete cascade,
  title text not null default 'Notes',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topic_pages_topic_id_idx on topic_pages (topic_id, sort_order);
