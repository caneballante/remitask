export type TaskStatus = "Inbox" | "Today" | "Next" | "Waiting" | "Scheduled" | "Done" | "Someday";
export type TaskPriority = "P1" | "P2" | "P3";
export type TaskEffort = "Quick" | "Medium" | "Deep";
export type TaskEnergy = "Low-focus" | "Normal" | "High-focus";
export type TaskContext = "Email" | "Meeting" | "Writing" | "Website" | "Design" | "Follow-up" | "Admin";

export type Meeting = {
  id: string;
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
  completedAt?: string;
};

export type AppState = {
  tasks: Task[];
  meetings: Meeting[];
  notes: unknown[];
  imports: string[];
};

export type TaskSuggestion = Omit<Task, "id" | "createdAt" | "completedAt"> & {
  selected: boolean;
};
