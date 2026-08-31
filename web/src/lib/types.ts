export type TaskStatus = "Inbox" | "Today" | "Next" | "Waiting" | "Scheduled" | "Done" | "Someday";
export type TaskPriority = "P1" | "P2" | "P3";
export type TaskEffort = "Quick" | "Medium" | "Deep";
export type TaskEnergy = "Low-focus" | "Normal" | "High-focus";
export type TaskContext = "Email" | "Meeting" | "Writing" | "Website" | "Design" | "Follow-up" | "Admin";
export type Space = "work" | "personal";

export type Meeting = {
  id: string;
  space: Space;
  calendarUid?: string;
  title: string;
  project: string;
  date: string;
  start: string;
  end: string;
  location: string;
  attendees: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

export type Task = {
  id: string;
  space: Space;
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  effort: TaskEffort;
  energy: TaskEnergy;
  context: TaskContext;
  owner: string;
  due: string;
  notes: string;
  meetingId: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
};

export type Topic = {
  id: string;
  space: Space;
  title: string;
  project: string;
  notes: string;
  pages: TopicPage[];
  createdAt: string;
  updatedAt?: string;
};

export type TopicPage = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

export type AppState = {
  tasks: Task[];
  meetings: Meeting[];
  topics: Topic[];
  notes: unknown[];
  imports: string[];
};

export type EntityChanges<T> = {
  upsert: T[];
  deleteIds: string[];
};

export type StateChanges = {
  meetings: EntityChanges<Meeting>;
  tasks: EntityChanges<Task>;
  topics: EntityChanges<Topic>;
};

export type MovableEntityKind = "meeting" | "task" | "topic";

export type TaskSuggestion = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt"> & {
  selected: boolean;
};
