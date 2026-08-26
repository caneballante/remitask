"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  Component,
  ErrorInfo,
  FormEvent,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppState,
  Meeting,
  Task,
  TaskContext,
  TaskEffort,
  TaskEnergy,
  TaskPriority,
  TaskStatus,
  TaskSuggestion,
  Topic,
  TopicPage,
} from "@/lib/types";
import { extractMarkedTaskTitles, markedTaskTitle } from "@/lib/task-markers";

const TASK_STATUSES: TaskStatus[] = ["Inbox", "Today", "Next", "Waiting", "Scheduled", "Done", "Someday"];
const TASK_PRIORITIES: TaskPriority[] = ["P1", "P2", "P3"];
const TASK_EFFORTS: TaskEffort[] = ["Quick", "Medium", "Deep"];
const TASK_ENERGIES: TaskEnergy[] = ["Low-focus", "Normal", "High-focus"];
const TASK_CONTEXTS: TaskContext[] = ["Email", "Meeting", "Writing", "Website", "Design", "Follow-up", "Admin"];
const MEETING_DAY_TONES = [
  "border-[#d7e4de] bg-[#fbfcfc]",
  "border-[#d7ddeb] bg-[#f7f9fd]",
  "border-[#e3ddcf] bg-[#fffaf1]",
];

const EMPTY_STATE: AppState = {
  meetings: [],
  tasks: [],
  topics: [],
  notes: [],
  imports: [],
};

type ActiveTab = "dashboard" | "meetings" | "tasks" | "topics";
type TaskView = "today" | "next" | "waiting" | "projects" | "done";
type SaveStatus = "Loaded" | "Saving..." | "Saved" | "Save failed";
type MeetingNotesFilter = "all" | "with-notes" | "without-notes";
type MeetingAgeFilter = "recent" | "all";
type SessionState = {
  checked: boolean;
  authenticated: boolean;
  authRequired: boolean;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class RemiTaskErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RemiTask client error", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7f6] px-4 text-[#17201c]">
        <section className="max-w-xl rounded-lg border border-[#d9e1dd] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#9f2b2b]">RemiTask could not render</p>
          <h1 className="mt-2 text-xl font-semibold">The data loaded, but the app hit a browser-side error.</h1>
          <p className="mt-3 text-sm leading-6 text-[#53635c]">
            Refresh once. If this keeps happening, send this message back so we can pin down the exact browser issue.
          </p>
          <pre className="mt-4 max-h-56 overflow-auto rounded-md bg-[#f7f9f8] p-3 text-xs text-[#17201c]">
            {this.state.error.name}: {this.state.error.message}
          </pre>
        </section>
      </main>
    );
  }
}

export function RemiTaskApp() {
  const [session, setSession] = useState<SessionState>({
    checked: false,
    authenticated: false,
    authRequired: true,
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [appState, setAppState] = useState<AppState>(EMPTY_STATE);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("Loaded");
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [meetingSearch, setMeetingSearch] = useState("");
  const [meetingNotesFilter, setMeetingNotesFilter] = useState<MeetingNotesFilter>("all");
  const [meetingAgeFilter, setMeetingAgeFilter] = useState<MeetingAgeFilter>("recent");
  const [taskView, setTaskView] = useState<TaskView>("today");
  const [taskSearch, setTaskSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [meetingDraft, setMeetingDraft] = useState<Meeting | null>(null);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [topicDraft, setTopicDraft] = useState<Topic | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());
  const [expandedTopicNotes, setExpandedTopicNotes] = useState<Set<string>>(() => new Set());
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [suggestionMeeting, setSuggestionMeeting] = useState<Meeting | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [icsStatus, setIcsStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const appStateRef = useRef(appState);
  const saveQueueRef = useRef(Promise.resolve());
  const saveGenerationRef = useRef(0);
  const meetingDraftBaselineRef = useRef("");
  const taskDraftBaselineRef = useRef("");
  const topicDraftBaselineRef = useRef("");
  const suggestionBaselineRef = useRef("");

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const body = (await response.json()) as Partial<SessionState>;
        setSession({
          checked: true,
          authenticated: Boolean(body.authenticated),
          authRequired: Boolean(body.authRequired),
        });
      } catch {
        setSession({ checked: true, authenticated: false, authRequired: true });
      }
    }

    void checkSession();
  }, []);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    if (!session.checked || !session.authenticated) return;

    async function loadState() {
      setIsLoadingState(true);
      setLoadError("");
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.status === 401) {
          setSession((current) => ({ ...current, authenticated: false, authRequired: true }));
          return;
        }
        if (!response.ok) throw new Error("Unable to load RemiTask data.");
        const loaded = normalizeLoadedState(await response.json());
        appStateRef.current = loaded;
        setAppState(loaded);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load RemiTask data.");
      } finally {
        setIsLoadingState(false);
      }
    }

    void loadState();
  }, [session.checked, session.authenticated]);

  const persistState = useCallback((nextState: AppState) => {
    const generation = ++saveGenerationRef.current;
    setSaveStatus("Saving...");

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextState),
        });

        if (response.status === 401) {
          setSession((current) => ({ ...current, authenticated: false, authRequired: true }));
          throw new Error("Session expired.");
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Unable to save RemiTask data.");
        }
      });

    saveQueueRef.current
      .then(() => {
        if (saveGenerationRef.current === generation) setSaveStatus("Saved");
      })
      .catch(() => setSaveStatus("Save failed"));

    return saveQueueRef.current;
  }, []);

  const commitState = useCallback(
    (updater: (current: AppState) => AppState) => {
      const next = normalizeLoadedState(updater(appStateRef.current));
      appStateRef.current = next;
      setAppState(next);
      return persistState(next);
    },
    [persistState],
  );

  const projects = useMemo(() => {
    return [
      ...new Set(
        [
          ...appState.meetings.map((meeting) => meeting.project),
          ...appState.tasks.map((task) => task.project),
          ...appState.topics.map((topic) => topic.project),
        ]
          .map((project) => project.trim())
          .filter(Boolean),
      ),
    ].sort();
  }, [appState.meetings, appState.tasks, appState.topics]);

  const meetingsForSelectedDate = useMemo(() => {
    return appState.meetings
      .filter((meeting) => meeting.date === selectedDate)
      .sort((left, right) => meetingDateTime(left).localeCompare(meetingDateTime(right)));
  }, [appState.meetings, selectedDate]);

  const allMeetings = useMemo(() => {
    return [...appState.meetings].sort((left, right) => meetingDateTime(right).localeCompare(meetingDateTime(left)));
  }, [appState.meetings]);

  const meetingRecencyCutoff = recentMeetingCutoff();
  const visibleMeetings = useMemo(() => {
    const search = meetingSearch.trim().toLowerCase();
    return allMeetings.filter((meeting) => {
      if (meetingAgeFilter === "recent" && meeting.date < meetingRecencyCutoff) return false;
      const hasNotes = Boolean(meeting.notes.trim());
      if (meetingNotesFilter === "with-notes" && !hasNotes) return false;
      if (meetingNotesFilter === "without-notes" && hasNotes) return false;
      if (!search) return true;
      const haystack = [meeting.title, meeting.project, meeting.date, meeting.location, meeting.attendees, meeting.notes].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [allMeetings, meetingAgeFilter, meetingNotesFilter, meetingRecencyCutoff, meetingSearch]);

  const allTopics = useMemo(() => {
    return [...appState.topics].sort(sortTopicsForDisplay);
  }, [appState.topics]);

  const visibleTopics = useMemo(() => {
    const search = topicSearch.trim().toLowerCase();
    if (!search) return allTopics;
    return allTopics.filter((topic) => {
      const pageText = topic.pages.flatMap((page) => [page.title, page.notes]);
      return [topic.title, topic.project, topic.notes, ...pageText].join(" ").toLowerCase().includes(search);
    });
  }, [allTopics, topicSearch]);

  const dashboardTasks = useMemo(() => {
    return appState.tasks
      .filter((task) => {
        if (task.status === "Today") return true;
        return task.status === "Done" && task.completedAt?.slice(0, 10) === selectedDate;
      })
      .sort(sortTasksForDisplay);
  }, [appState.tasks, selectedDate]);

  const visibleTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();
    return appState.tasks
      .filter((task) => {
        const haystack = [task.title, task.project, task.notes].join(" ").toLowerCase();
        if (search && !haystack.includes(search)) return false;
        if (projectFilter && task.project !== projectFilter) return false;
        if (taskView === "today") return task.status === "Today";
        if (taskView === "next") return ["Inbox", "Next", "Scheduled"].includes(task.status);
        if (taskView === "waiting") return task.status === "Waiting";
        if (taskView === "done") return task.status === "Done";
        return task.status !== "Done";
      })
      .sort(sortTasksForDisplay);
  }, [appState.tasks, projectFilter, taskSearch, taskView]);

  const summaryItems = useMemo(() => {
    const active = appState.tasks.filter((task) => task.status !== "Done");
    return [
      ["Meetings", meetingsForSelectedDate.length],
      ["Topics", appState.topics.length],
      ["Today", appState.tasks.filter((task) => task.status === "Today").length],
      ["P1", active.filter((task) => task.priority === "P1").length],
      ["Quick", active.filter((task) => task.effort === "Quick").length],
      ["Waiting", appState.tasks.filter((task) => task.status === "Waiting").length],
    ];
  }, [appState.tasks, appState.topics.length, meetingsForSelectedDate.length]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<SessionState> & { error?: string };

    if (!response.ok) {
      setLoginError(body.error || "That password did not work.");
      return;
    }

    setLoginPassword("");
    setSession({
      checked: true,
      authenticated: Boolean(body.authenticated),
      authRequired: Boolean(body.authRequired),
    });
  }

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    setSession((current) => ({
      ...current,
      authenticated: !current.authRequired,
    }));
  }

  function openMeetingEditor(meeting?: Meeting) {
    const draft = meeting ? { ...meeting } : blankMeeting(selectedDate);
    meetingDraftBaselineRef.current = draftSnapshot(draft);
    setMeetingDraft(draft);
  }

  function closeMeetingEditor() {
    if (!meetingDraft || !confirmDiscardChanges(meetingDraft, meetingDraftBaselineRef.current)) return;
    meetingDraftBaselineRef.current = "";
    setMeetingDraft(null);
  }

  function saveMeetingDraft(options: { close?: boolean } = {}) {
    if (!meetingDraft) return null;
    const now = new Date().toISOString();
    const existing = appStateRef.current.meetings.find((meeting) => meeting.id === meetingDraft.id);
    const savedMeeting: Meeting = {
      ...meetingDraft,
      title: meetingDraft.title.trim() || "Untitled meeting",
      project: meetingDraft.project.trim(),
      location: meetingDraft.location.trim(),
      attendees: meetingDraft.attendees.trim(),
      notes: meetingDraft.notes.trim(),
      createdAt: existing?.createdAt || meetingDraft.createdAt || now,
      updatedAt: now,
    };

    commitState((current) => ({
      ...current,
      meetings: current.meetings.some((meeting) => meeting.id === savedMeeting.id)
        ? current.meetings.map((meeting) => (meeting.id === savedMeeting.id ? savedMeeting : meeting))
        : [savedMeeting, ...current.meetings],
    }));
    if (options.close === false) {
      meetingDraftBaselineRef.current = draftSnapshot(savedMeeting);
      setMeetingDraft(savedMeeting);
    } else {
      meetingDraftBaselineRef.current = "";
      setMeetingDraft(null);
    }
    return savedMeeting;
  }

  function deleteMeeting(id: string) {
    const meeting = appStateRef.current.meetings.find((item) => item.id === id);
    if (!meeting) return;
    if (!confirm(`Delete "${meeting.title || "this meeting"}"? Linked tasks will stay, but their meeting link will be cleared.`)) {
      return;
    }

    commitState((current) => ({
      ...current,
      meetings: current.meetings.filter((item) => item.id !== id),
      tasks: current.tasks.map((task) => (task.meetingId === id ? { ...task, meetingId: "" } : task)),
    }));
    if (meetingDraft?.id === id) {
      meetingDraftBaselineRef.current = "";
      setMeetingDraft(null);
    }
    if (suggestionMeeting?.id === id) {
      setSuggestions([]);
      setSuggestionMeeting(null);
      setSuggestionMessage("");
      suggestionBaselineRef.current = "";
    }
  }

  function pullTasksForMeeting(meeting: Meeting, options: { revealMeetingsTab?: boolean } = {}) {
    const savedMeeting = appStateRef.current.meetings.find((item) => item.id === meeting.id) || meeting;
    if (options.revealMeetingsTab !== false) {
      setActiveTab("meetings");
    }

    const existingTitles = new Set(
      appStateRef.current.tasks
        .filter((task) => task.meetingId === savedMeeting.id)
        .map((task) => task.title.trim()),
    );
    const pulledTasks = extractMarkedTaskTitles(savedMeeting.notes)
      .filter((title) => !existingTitles.has(title.trim()))
      .map((title): TaskSuggestion => ({
        selected: true,
        title,
        project: savedMeeting.project || "Inbox",
        status: "Next",
        priority: "P2",
        effort: "Quick",
        energy: "Normal",
        context: "Follow-up",
        owner: "",
        due: "",
        meetingId: savedMeeting.id,
        notes: `Source: ${formatDate(savedMeeting.date)} ${savedMeeting.title}`,
      }));

    setSuggestionMeeting(savedMeeting);
    setSuggestions(pulledTasks);
    suggestionBaselineRef.current = JSON.stringify(pulledTasks);
    setSuggestionMessage(
      pulledTasks.length
        ? "Review the marked task lines, then create them together."
        : "No new marked tasks found. In the meeting notes, put the cursor on a line and choose Task, then try again.",
    );
  }

  function saveDraftAndPullTasks() {
    const savedMeeting = saveMeetingDraft();
    if (savedMeeting) pullTasksForMeeting(savedMeeting, { revealMeetingsTab: false });
  }

  function closeBulkTaskEditor() {
    if (
      suggestionBaselineRef.current &&
      JSON.stringify(suggestions) !== suggestionBaselineRef.current &&
      !confirm("Discard changes to these pulled tasks?")
    ) {
      return;
    }
    suggestionBaselineRef.current = "";
    setSuggestions([]);
    setSuggestionMeeting(null);
    setSuggestionMessage("");
  }

  function addBulkTasks() {
    const now = new Date().toISOString();
    const newTasks: Task[] = suggestions
      .filter((suggestion) => suggestion.title.trim())
      .map((suggestion) => ({
        id: createId(),
        title: suggestion.title.trim(),
        project: suggestion.project.trim() || "Inbox",
        status: suggestion.status,
        priority: suggestion.priority,
        effort: suggestion.effort,
        energy: suggestion.energy,
        context: suggestion.context,
        owner: suggestion.owner,
        due: suggestion.due,
        notes: suggestion.notes,
        meetingId: suggestion.meetingId,
        createdAt: now,
        completedAt: "",
      }));

    if (!newTasks.length) return;
    commitState((current) => ({
      ...current,
      tasks: [...newTasks, ...current.tasks],
    }));
    suggestionBaselineRef.current = "";
    setSuggestions([]);
    setSuggestionMeeting(null);
    setSuggestionMessage("");
  }

  function openTaskEditor(task?: Task, project?: string) {
    const draft = task ? { ...task } : blankTask(project || projects[0] || "Inbox");
    taskDraftBaselineRef.current = draftSnapshot(draft);
    setTaskDraft(draft);
  }

  function openTopicEditor(topic?: Topic) {
    const draft = topic ? { ...topic, pages: topic.pages.map((page) => ({ ...page })) } : blankTopic(projects[0] || "Inbox");
    topicDraftBaselineRef.current = draftSnapshot(draft);
    setTopicDraft(draft);
  }

  function closeTaskEditor() {
    if (!taskDraft || !confirmDiscardChanges(taskDraft, taskDraftBaselineRef.current)) return;
    taskDraftBaselineRef.current = "";
    setTaskDraft(null);
  }

  function closeTopicEditor() {
    if (!topicDraft || !confirmDiscardChanges(topicDraft, topicDraftBaselineRef.current)) return;
    topicDraftBaselineRef.current = "";
    setTopicDraft(null);
  }

  function saveTaskDraft() {
    if (!taskDraft) return;
    const now = new Date().toISOString();
    const existing = appStateRef.current.tasks.find((task) => task.id === taskDraft.id);
    const nextTask: Task = {
      ...taskDraft,
      title: taskDraft.title.trim(),
      project: taskDraft.project.trim() || "Inbox",
      owner: taskDraft.owner.trim(),
      notes: taskDraft.notes.trim(),
      createdAt: existing?.createdAt || taskDraft.createdAt || now,
      completedAt: taskDraft.status === "Done" ? taskDraft.completedAt || now : "",
    };
    if (!nextTask.title) return;

    commitState((current) => ({
      ...current,
      tasks: current.tasks.some((task) => task.id === nextTask.id)
        ? current.tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
        : [nextTask, ...current.tasks],
    }));
    taskDraftBaselineRef.current = "";
    setTaskDraft(null);
  }

  function deleteTask(id: string) {
    const task = appStateRef.current.tasks.find((item) => item.id === id);
    if (!task) return;
    if (!confirm(`Delete "${task.title || "this task"}"?`)) return;
    commitState((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== id),
    }));
    taskDraftBaselineRef.current = "";
    setTaskDraft(null);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    commitState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }));
  }

  function toggleTaskDone(task: Task) {
    if (task.status === "Done") {
      updateTask(task.id, { status: "Today", completedAt: "" });
      return;
    }
    updateTask(task.id, { status: "Done", completedAt: new Date().toISOString() });
  }

  function saveTopicDraft() {
    if (!topicDraft) return;
    const now = new Date().toISOString();
    const existing = appStateRef.current.topics.find((topic) => topic.id === topicDraft.id);
    const pages = topicDraft.pages.length
      ? topicDraft.pages.map((page, index) => ({
          ...page,
          title: page.title.trim() || `Page ${index + 1}`,
          notes: page.notes.trim(),
          createdAt: page.createdAt || now,
          updatedAt: page.updatedAt || now,
        }))
      : [blankTopicPage("Notes", topicDraft.notes)];
    const nextTopic: Topic = {
      ...topicDraft,
      title: topicDraft.title.trim(),
      project: topicDraft.project.trim() || "Inbox",
      notes: pages[0]?.notes || "",
      pages,
      createdAt: existing?.createdAt || topicDraft.createdAt || now,
      updatedAt: now,
    };
    if (!nextTopic.title) return;

    commitState((current) => ({
      ...current,
      topics: current.topics.some((topic) => topic.id === nextTopic.id)
        ? current.topics.map((topic) => (topic.id === nextTopic.id ? nextTopic : topic))
        : [nextTopic, ...current.topics],
    }));
    topicDraftBaselineRef.current = "";
    setTopicDraft(null);
  }

  function deleteTopic(id: string) {
    const topic = appStateRef.current.topics.find((item) => item.id === id);
    if (!topic) {
      topicDraftBaselineRef.current = "";
      setTopicDraft(null);
      return;
    }
    if (!confirm(`Delete "${topic.title || "this topic"}"?`)) return;
    commitState((current) => ({
      ...current,
      topics: current.topics.filter((item) => item.id !== id),
    }));
    setExpandedTopicNotes((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    topicDraftBaselineRef.current = "";
    setTopicDraft(null);
  }

  function makeTaskFromTopic(topic: Topic) {
    const page = topicPreviewPage(topic);
    const blankDraft = blankTask(topic.project || "Inbox");
    taskDraftBaselineRef.current = draftSnapshot(blankDraft);
    setTaskDraft({
      ...blankDraft,
      title: topic.title,
      notes: page?.notes || topic.notes,
    });
  }

  function makeTopicFromMeeting(meeting: Meeting) {
    const source = `${formatDate(meeting.date)}${meeting.start ? ` ${formatTime(meeting.start)}` : ""}`;
    const title = meeting.title || "Meeting notes";
    const notes = [`Source: ${source} - ${title}`, meeting.notes.trim()].filter(Boolean).join("\n\n");
    const topic = blankTopic(meeting.project || projects[0] || "Inbox");
    meetingDraftBaselineRef.current = "";
    setMeetingDraft(null);
    topicDraftBaselineRef.current = draftSnapshot(topic);
    setTopicDraft({
      ...topic,
      title,
      notes,
      pages: [{ ...topic.pages[0], notes }],
    });
  }

  function exportData() {
    const data = JSON.stringify(appStateRef.current, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meeting-task-dashboard-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      const importedState = normalizeLoadedState(JSON.parse(text));
      const previousState = appStateRef.current;
      appStateRef.current = importedState;
      setAppState(importedState);
      try {
        await persistState(importedState);
        setImportStatus(`Imported ${importedState.meetings.length} meetings, ${importedState.tasks.length} tasks, and ${importedState.topics.length} topics.`);
      } catch (error) {
        appStateRef.current = previousState;
        setAppState(previousState);
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "That JSON file could not be imported.";
      setImportStatus(message);
    } finally {
      event.target.value = "";
    }
  }

  async function importIcs(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      const imported = parseIcsMeetings(text);
      if (!imported.length) {
        setIcsStatus("No calendar events found in that .ics file.");
        return;
      }

      const previousState = appStateRef.current;
      setIcsStatus(`Saving ${imported.length} calendar meeting${imported.length === 1 ? "" : "s"}...`);
      try {
        await commitState((current) => {
          const byKey = new Map<string, Meeting>();
          current.meetings.forEach((meeting) => {
            byKey.set(importedMeetingKey(meeting), meeting);
          });
          imported.forEach((meeting) => {
            const key = importedMeetingKey(meeting);
            const existing = byKey.get(key);
            byKey.set(key, {
              ...existing,
              ...meeting,
              id: existing?.id || meeting.id,
              notes: existing?.notes || "",
              createdAt: existing?.createdAt || meeting.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          });
          return { ...current, meetings: [...byKey.values()] };
        });
      } catch (error) {
        appStateRef.current = previousState;
        setAppState(previousState);
        throw error;
      }
      setActiveTab("meetings");
      setIcsStatus(`Imported and saved ${imported.length} calendar meeting${imported.length === 1 ? "" : "s"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "That .ics file could not be imported.";
      setIcsStatus(message);
    } finally {
      event.target.value = "";
    }
  }

  function toggleNotes(meetingId: string) {
    setExpandedNotes((current) => {
      const next = new Set(current);
      if (next.has(meetingId)) next.delete(meetingId);
      else next.add(meetingId);
      return next;
    });
  }

  function toggleTopicNotes(topicId: string) {
    setExpandedTopicNotes((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  if (!session.checked) {
    return <ShellMessage title="Loading RemiTask" body="Checking your session..." />;
  }

  if (!session.authenticated) {
    return (
      <main className="min-h-screen bg-[#f5f7f6] px-4 py-10 text-[#17201c]">
        <section className="mx-auto max-w-sm rounded-lg border border-[#d9e1dd] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#235d91]">RemiTask</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <form className="mt-5 grid gap-3" onSubmit={handleLogin}>
            <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
              App password
              <input
                className="rounded-md border border-[#cfd9d4] px-3 py-2 text-[#17201c] outline-none focus:border-[#0b6b5c]"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoFocus
              />
            </label>
            {loginError ? <p className="text-sm font-semibold text-[#9f2b2b]">{loginError}</p> : null}
            <button className="rounded-md bg-[#17201c] px-4 py-2 font-semibold text-white" type="submit">
              Open RemiTask
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (isLoadingState) {
    return <ShellMessage title="Loading RemiTask" body="Pulling your meetings, tasks, and topics from Neon..." />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7f6] text-[#17201c]">
      <header className="border-b border-[#d9e1dd] bg-white px-3 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[#235d91]">Meeting notes / task tracking</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl">RemiTask</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <label className="col-span-2 flex min-w-0 items-center gap-2 rounded-md border border-[#cfd9d4] bg-[#f7f9f8] px-3 py-2 text-sm font-semibold text-[#53635c] sm:col-span-1 sm:w-auto">
              Date
              <input
                className="min-w-0 flex-1 bg-transparent text-[#17201c] outline-none sm:w-[9.5rem] sm:flex-none"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value || todayIso())}
              />
            </label>
            <button className="primary-button" type="button" onClick={() => openMeetingEditor()}>
              New meeting
            </button>
            <button className="secondary-button" type="button" onClick={() => openTaskEditor()}>
              New task
            </button>
            <button className="secondary-button" type="button" onClick={() => openTopicEditor()}>
              New topic
            </button>
            <FileButton label="Import ICS" accept=".ics,text/calendar" onChange={importIcs} />
            {session.authRequired ? (
              <button className="ghost-button" type="button" onClick={handleLogout}>
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <StatusDot label={saveStatus} tone={saveStatus === "Save failed" ? "bad" : saveStatus === "Saving..." ? "wait" : "good"} />
          {loadError ? <span className="font-semibold text-[#9f2b2b]">{loadError}</span> : null}
          {icsStatus ? <span className="text-[#53635c]">{icsStatus}</span> : null}
          {importStatus ? <span className="text-[#53635c]">{importStatus}</span> : null}
        </div>
        <details className="mt-4 rounded-md border border-[#d9e1dd] bg-[#fbfcfc] p-3 text-sm text-[#53635c]">
          <summary className="cursor-pointer font-bold text-[#17201c]">Admin</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <FileButton label="Import JSON" accept="application/json,.json" onChange={importJson} />
            <button className="secondary-button" type="button" onClick={exportData}>
              Export JSON
            </button>
          </div>
        </details>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b border-[#d9e1dd] bg-white px-3 py-3 sm:px-6 lg:px-8">
        {[
          ["dashboard", "Dashboard"],
          ["meetings", "Meetings"],
          ["tasks", "Tasks"],
          ["topics", "Topics"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={activeTab === id ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => setActiveTab(id as ActiveTab)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        {activeTab === "dashboard" ? (
          <DashboardView
            summaryItems={summaryItems}
            meetings={meetingsForSelectedDate}
            tasks={dashboardTasks}
            topics={allTopics.slice(0, 4)}
            totalTopics={allTopics.length}
            expandedNotes={expandedNotes}
            expandedTopicNotes={expandedTopicNotes}
            onToggleNotes={toggleNotes}
            onToggleTopicNotes={toggleTopicNotes}
            onEditMeeting={openMeetingEditor}
            onExtractMeeting={pullTasksForMeeting}
            onDeleteMeeting={deleteMeeting}
            onToggleTaskDone={toggleTaskDone}
            onEditTask={openTaskEditor}
            onEditTopic={openTopicEditor}
            onMakeTaskFromTopic={makeTaskFromTopic}
            onDeleteTopic={deleteTopic}
            onViewAllTopics={() => setActiveTab("topics")}
            onMoveTaskToday={(id) => updateTask(id, { status: "Today" })}
            onMoveTaskWaiting={(id) => updateTask(id, { status: "Waiting" })}
          />
        ) : null}

        {activeTab === "meetings" ? (
          <MeetingsView
            meetings={visibleMeetings}
            totalMeetings={allMeetings.length}
            expandedNotes={expandedNotes}
            meetingSearch={meetingSearch}
            meetingNotesFilter={meetingNotesFilter}
            meetingAgeFilter={meetingAgeFilter}
            onSearchChange={setMeetingSearch}
            onNotesFilterChange={setMeetingNotesFilter}
            onAgeFilterChange={setMeetingAgeFilter}
            onNewMeeting={() => openMeetingEditor()}
            onToggleNotes={toggleNotes}
            onEditMeeting={openMeetingEditor}
            onExtractMeeting={pullTasksForMeeting}
            onDeleteMeeting={deleteMeeting}
          />
        ) : null}

        {activeTab === "tasks" ? (
          <TasksView
            tasks={visibleTasks}
            projects={projects}
            projectFilter={projectFilter}
            taskSearch={taskSearch}
            taskView={taskView}
            onProjectFilterChange={setProjectFilter}
            onSearchChange={setTaskSearch}
            onTaskViewChange={setTaskView}
            onToggleTaskDone={toggleTaskDone}
            onEditTask={openTaskEditor}
            onAddTask={(project) => openTaskEditor(undefined, project)}
            onMoveTaskToday={(id) => updateTask(id, { status: "Today" })}
            onMoveTaskWaiting={(id) => updateTask(id, { status: "Waiting" })}
          />
        ) : null}

        {activeTab === "topics" ? (
          <TopicsView
            topics={visibleTopics}
            totalTopics={allTopics.length}
            topicSearch={topicSearch}
            expandedTopicNotes={expandedTopicNotes}
            onSearchChange={setTopicSearch}
            onNewTopic={() => openTopicEditor()}
            onToggleTopicNotes={toggleTopicNotes}
            onEditTopic={openTopicEditor}
            onMakeTask={makeTaskFromTopic}
            onDeleteTopic={deleteTopic}
          />
        ) : null}
      </section>

      {meetingDraft ? (
        <Modal title={meetingDraft.title || "Meeting"} onClose={closeMeetingEditor}>
          <MeetingEditor
            draft={meetingDraft}
            projects={projects}
            onChange={(patch) => setMeetingDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={() => saveMeetingDraft()}
            onDelete={() => deleteMeeting(meetingDraft.id)}
            onPullTasks={saveDraftAndPullTasks}
            onMakeTopic={() => {
              const savedMeeting = saveMeetingDraft({ close: false });
              if (savedMeeting) makeTopicFromMeeting(savedMeeting);
            }}
          />
        </Modal>
      ) : null}

      {taskDraft ? (
        <Modal
          title={taskDraft.title || "Task"}
          onClose={closeTaskEditor}
          headerActions={
            <button className="primary-button" type="button" onClick={saveTaskDraft} disabled={!taskDraft.title.trim()}>
              Save and close
            </button>
          }
        >
          <TaskEditor
            draft={taskDraft}
            projects={projects}
            onChange={(patch) => setTaskDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={saveTaskDraft}
            onDelete={() => deleteTask(taskDraft.id)}
          />
        </Modal>
      ) : null}

      {suggestionMeeting ? (
        <Modal title={`Pull tasks from ${suggestionMeeting.title}`} onClose={closeBulkTaskEditor}>
          <BulkTaskEditor
            suggestions={suggestions}
            message={suggestionMessage}
            projects={projects}
            onChange={(index, patch) =>
              setSuggestions((current) => current.map((suggestion, itemIndex) => (itemIndex === index ? { ...suggestion, ...patch } : suggestion)))
            }
            onRemove={(index) => setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            onSave={addBulkTasks}
          />
        </Modal>
      ) : null}

      {topicDraft ? (
        <Modal title={topicDraft.title || "Topic"} onClose={closeTopicEditor}>
          <TopicEditor
            draft={topicDraft}
            projects={projects}
            onChange={(patch) => setTopicDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={saveTopicDraft}
            onDelete={() => deleteTopic(topicDraft.id)}
          />
        </Modal>
      ) : null}
    </main>
  );
}

function DashboardView({
  summaryItems,
  meetings,
  tasks,
  topics,
  totalTopics,
  expandedNotes,
  expandedTopicNotes,
  onToggleNotes,
  onToggleTopicNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
  onToggleTaskDone,
  onEditTask,
  onEditTopic,
  onMakeTaskFromTopic,
  onDeleteTopic,
  onViewAllTopics,
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  summaryItems: (string | number)[][];
  meetings: Meeting[];
  tasks: Task[];
  topics: Topic[];
  totalTopics: number;
  expandedNotes: Set<string>;
  expandedTopicNotes: Set<string>;
  onToggleNotes: (id: string) => void;
  onToggleTopicNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  onToggleTaskDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditTopic: (topic: Topic) => void;
  onMakeTaskFromTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onViewAllTopics: () => void;
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]">
        {summaryItems.map(([label, count]) => (
          <div key={String(label)} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <strong className="block text-2xl">{count}</strong>
            <span className="text-sm font-semibold text-[#53635c]">{label}</span>
          </div>
        ))}
      </section>
      <section className="grid min-w-0 gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
        <Panel title="Calendar" className="xl:col-span-2 2xl:col-span-1">
          <MeetingList
            meetings={meetings}
            expandedNotes={expandedNotes}
            emptyText="No meetings on this date."
            density="compact"
            onToggleNotes={onToggleNotes}
            onEditMeeting={onEditMeeting}
            onExtractMeeting={onExtractMeeting}
            onDeleteMeeting={onDeleteMeeting}
          />
        </Panel>
        <Panel title="Today">
          <TaskList
            tasks={tasks}
            emptyText="No Today tasks yet."
            onToggleTaskDone={onToggleTaskDone}
            onEditTask={onEditTask}
            onMoveTaskToday={onMoveTaskToday}
            onMoveTaskWaiting={onMoveTaskWaiting}
          />
        </Panel>
        <Panel title="Topics">
          <TopicList
            topics={topics}
            expandedTopicNotes={expandedTopicNotes}
            emptyText="No topics yet."
            onToggleTopicNotes={onToggleTopicNotes}
            onEditTopic={onEditTopic}
            onMakeTask={onMakeTaskFromTopic}
            onDeleteTopic={onDeleteTopic}
          />
          {totalTopics > topics.length ? (
            <button className="secondary-button mt-3 w-full" type="button" onClick={onViewAllTopics}>
              View all {totalTopics} topics
            </button>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

function TopicsView({
  topics,
  totalTopics,
  topicSearch,
  expandedTopicNotes,
  onSearchChange,
  onNewTopic,
  onToggleTopicNotes,
  onEditTopic,
  onMakeTask,
  onDeleteTopic,
}: {
  topics: Topic[];
  totalTopics: number;
  topicSearch: string;
  expandedTopicNotes: Set<string>;
  onSearchChange: (search: string) => void;
  onNewTopic: () => void;
  onToggleTopicNotes: (id: string) => void;
  onEditTopic: (topic: Topic) => void;
  onMakeTask: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Topics</h2>
          <p className="text-sm text-[#53635c]">
            {topics.length} of {totalTopics} topic{totalTopics === 1 ? "" : "s"}
          </p>
        </div>
        <button className="primary-button w-full sm:w-auto" type="button" onClick={onNewTopic}>
          New topic
        </button>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
        Search topics and pages
        <input
          className="field"
          type="search"
          value={topicSearch}
          placeholder="Search titles, projects, and notes"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <TopicList
        topics={topics}
        expandedTopicNotes={expandedTopicNotes}
        emptyText={totalTopics ? "No topics match this search." : "No topics yet."}
        onToggleTopicNotes={onToggleTopicNotes}
        onEditTopic={onEditTopic}
        onMakeTask={onMakeTask}
        onDeleteTopic={onDeleteTopic}
      />
    </div>
  );
}

function MeetingsView({
  meetings,
  totalMeetings,
  expandedNotes,
  meetingSearch,
  meetingNotesFilter,
  meetingAgeFilter,
  onSearchChange,
  onNotesFilterChange,
  onAgeFilterChange,
  onNewMeeting,
  onToggleNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
}: {
  meetings: Meeting[];
  totalMeetings: number;
  expandedNotes: Set<string>;
  meetingSearch: string;
  meetingNotesFilter: MeetingNotesFilter;
  meetingAgeFilter: MeetingAgeFilter;
  onSearchChange: (search: string) => void;
  onNotesFilterChange: (filter: MeetingNotesFilter) => void;
  onAgeFilterChange: (filter: MeetingAgeFilter) => void;
  onNewMeeting: () => void;
  onToggleNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Meetings</h2>
          <p className="mt-1 text-sm text-[#53635c]">Notes stay visible here, and calendar imports preserve any notes you add manually.</p>
        </div>
        <button className="primary-button w-full sm:w-auto" type="button" onClick={onNewMeeting}>
          New meeting
        </button>
      </div>
      <section className="grid min-w-0 gap-3 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm sm:p-4 xl:grid-cols-[minmax(220px,1fr)_auto_auto] xl:items-center">
        <input
          className="field"
          type="search"
          value={meetingSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search meeting notes"
        />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {[
            ["recent", "Recent 30 days"],
            ["all", "All history"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={meetingAgeFilter === id ? "small-tab active" : "small-tab"}
              type="button"
              onClick={() => onAgeFilterChange(id as MeetingAgeFilter)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {[
            ["all", "All"],
            ["with-notes", "Has notes"],
            ["without-notes", "No notes"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={meetingNotesFilter === id ? "small-tab active" : "small-tab"}
              type="button"
              onClick={() => onNotesFilterChange(id as MeetingNotesFilter)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <Panel title={`Calendar events${meetings.length === totalMeetings ? "" : ` (${meetings.length} of ${totalMeetings})`}`}>
        <MeetingList
          meetings={meetings}
          expandedNotes={expandedNotes}
          emptyText={totalMeetings ? "No meetings match these filters." : "No meetings yet."}
          showDayHeaders
          onToggleNotes={onToggleNotes}
          onEditMeeting={onEditMeeting}
          onExtractMeeting={onExtractMeeting}
          onDeleteMeeting={onDeleteMeeting}
        />
      </Panel>
    </div>
  );
}

function TasksView({
  tasks,
  projects,
  projectFilter,
  taskSearch,
  taskView,
  onProjectFilterChange,
  onSearchChange,
  onTaskViewChange,
  onToggleTaskDone,
  onEditTask,
  onAddTask,
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  tasks: Task[];
  projects: string[];
  projectFilter: string;
  taskSearch: string;
  taskView: TaskView;
  onProjectFilterChange: (project: string) => void;
  onSearchChange: (search: string) => void;
  onTaskViewChange: (view: TaskView) => void;
  onToggleTaskDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (project: string) => void;
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  const groupedTasks = groupTasksByProject(tasks);

  return (
    <div className="grid gap-4">
      <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {[
            ["today", "Today"],
            ["next", "Next"],
            ["waiting", "Waiting"],
            ["projects", "Projects"],
            ["done", "Done"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={taskView === id ? "small-tab active" : "small-tab"}
              type="button"
              onClick={() => onTaskViewChange(id as TaskView)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)] lg:max-w-xl">
          <input
            className="field"
            type="search"
            value={taskSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks"
          />
          <select className="field" value={projectFilter} onChange={(event) => onProjectFilterChange(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>
      </section>

      {taskView === "projects" ? (
        <div className="grid gap-4">
          {groupedTasks.length ? (
            groupedTasks.map(([project, projectTasks]) => (
              <Panel
                key={project}
                title={project}
                action={
                  <button className="secondary-button" type="button" onClick={() => onAddTask(project)}>
                    Add task
                  </button>
                }
              >
                <TaskList
                  tasks={projectTasks}
                  emptyText="Nothing in this project."
                  onToggleTaskDone={onToggleTaskDone}
                  onEditTask={onEditTask}
                  onMoveTaskToday={onMoveTaskToday}
                  onMoveTaskWaiting={onMoveTaskWaiting}
                />
              </Panel>
            ))
          ) : (
            <EmptyState text="Nothing in this view." />
          )}
        </div>
      ) : (
        <Panel title="Tasks">
          <TaskList
            tasks={tasks}
            emptyText="Nothing in this view."
            onToggleTaskDone={onToggleTaskDone}
            onEditTask={onEditTask}
            onMoveTaskToday={onMoveTaskToday}
            onMoveTaskWaiting={onMoveTaskWaiting}
          />
        </Panel>
      )}
    </div>
  );
}

function MeetingList({
  meetings,
  expandedNotes,
  emptyText,
  density = "spacious",
  showDayHeaders = false,
  onToggleNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
}: {
  meetings: Meeting[];
  expandedNotes: Set<string>;
  emptyText: string;
  density?: "compact" | "spacious";
  showDayHeaders?: boolean;
  onToggleNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
}) {
  if (!meetings.length) return <EmptyState text={emptyText} />;
  const dayToneByDate = meetingDayToneMap(meetings);

  if (showDayHeaders) {
    return (
      <div className="grid gap-6">
        {groupMeetingsByDate(meetings).map(([date, dayMeetings]) => {
          const dayHeading = formatMeetingDayHeading(date);

          return (
            <section key={date} className="grid gap-3">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#d9e1dd] px-1 pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-lg font-semibold text-[#17201c]">{dayHeading.weekday}</h3>
                  <p className="text-sm font-medium text-[#53635c]">{dayHeading.date}</p>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6f7f78]">
                  {dayMeetings.length} {dayMeetings.length === 1 ? "meeting" : "meetings"}
                </p>
              </header>
              <div className="grid gap-3">
                {dayMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isExpanded={expandedNotes.has(meeting.id)}
                    density={density}
                    dayToneClass={MEETING_DAY_TONES[dayToneByDate.get(meeting.date) || 0]}
                    showDate={false}
                    onToggleNotes={onToggleNotes}
                    onEditMeeting={onEditMeeting}
                    onExtractMeeting={onExtractMeeting}
                    onDeleteMeeting={onDeleteMeeting}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          isExpanded={expandedNotes.has(meeting.id)}
          density={density}
          dayToneClass={MEETING_DAY_TONES[dayToneByDate.get(meeting.date) || 0]}
          onToggleNotes={onToggleNotes}
          onEditMeeting={onEditMeeting}
          onExtractMeeting={onExtractMeeting}
          onDeleteMeeting={onDeleteMeeting}
        />
      ))}
    </div>
  );
}

function MeetingCard({
  meeting,
  isExpanded,
  density,
  dayToneClass,
  showDate = true,
  onToggleNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
}: {
  meeting: Meeting;
  isExpanded: boolean;
  density: "compact" | "spacious";
  dayToneClass: string;
  showDate?: boolean;
  onToggleNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
}) {
  const hasMoreNotes = meeting.notes && (meeting.notes.length > 420 || meeting.notes.split(/\r?\n/).length > 4);
  const details = [meeting.project, meeting.location, meeting.attendees ? `With ${meeting.attendees}` : ""].filter(Boolean).join(" / ");
  const time = meeting.start ? `${formatTime(meeting.start)}${meeting.end ? `-${formatTime(meeting.end)}` : ""}` : "Any time";

  return (
    <article
      className={[
        "grid min-w-0 gap-3 rounded-lg border p-4",
        density === "spacious" ? "md:grid-cols-[7.5rem_minmax(0,1fr)_auto]" : "",
        dayToneClass,
      ].join(" ")}
    >
      <div className={density === "compact" ? "flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-[#235d91]" : "text-sm font-bold text-[#235d91]"}>
        <span className="block">{time}</span>
        {showDate ? <span className="block text-[#53635c]">{formatDate(meeting.date)}</span> : null}
      </div>
      <div className="min-w-0 [overflow-wrap:anywhere]">
        {showDate ? (
          <h3 className="text-base font-semibold leading-snug">{meeting.title}</h3>
        ) : (
          <h4 className="text-base font-semibold leading-snug">{meeting.title}</h4>
        )}
        {details ? <p className="mt-1 text-sm text-[#53635c]">{details}</p> : null}
        {meeting.notes ? (
          <div className={isExpanded ? "note-preview mt-3" : "note-preview compact mt-3"}>
            <NotePreview text={meeting.notes} maxLines={isExpanded ? Infinity : 4} />
          </div>
        ) : null}
        {hasMoreNotes ? (
          <button className="mt-2 text-sm font-bold text-[#0b6b5c]" type="button" onClick={() => onToggleNotes(meeting.id)}>
            {isExpanded ? "Less notes" : "More notes"}
          </button>
        ) : null}
      </div>
      <div
        className={
          density === "compact"
            ? "grid grid-cols-1 gap-2 min-[420px]:grid-cols-3"
            : "grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 md:flex md:flex-wrap md:items-start md:justify-end"
        }
      >
        <button className="secondary-button" type="button" onClick={() => onEditMeeting(meeting)}>
          Edit
        </button>
        <button className="secondary-button" type="button" onClick={() => onExtractMeeting(meeting)}>
          Pull tasks
        </button>
        <button className="danger-button" type="button" onClick={() => onDeleteMeeting(meeting.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

function TaskList({
  tasks,
  emptyText,
  onToggleTaskDone,
  onEditTask,
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  tasks: Task[];
  emptyText: string;
  onToggleTaskDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  if (!tasks.length) return <EmptyState text={emptyText} />;
  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
          <article
            key={task.id}
            className={[
              "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-4 [overflow-wrap:anywhere]",
              task.status === "Done" ? "border-[#d8dedb] opacity-70" : priorityBorder(task.priority),
            ].join(" ")}
          >
            <input
              className="mt-1 h-5 w-5 accent-[#0b6b5c]"
              type="checkbox"
              checked={task.status === "Done"}
              onChange={() => onToggleTaskDone(task)}
              aria-label="Mark task done"
            />
            <div className="min-w-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className={task.status === "Done" ? "font-semibold leading-snug line-through" : "font-semibold leading-snug"}>{task.title}</h3>
                  {task.notes ? (
                    <div className="note-preview compact mt-2 text-sm text-[#53635c]">
                      <NotePreview text={task.notes} maxLines={3} />
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:shrink-0 md:justify-end">
                  <button className="secondary-button" type="button" onClick={() => onEditTask(task)}>
                    Edit
                  </button>
                  {task.status !== "Today" && task.status !== "Done" ? (
                    <button className="secondary-button" type="button" onClick={() => onMoveTaskToday(task.id)}>
                      Today
                    </button>
                  ) : null}
                  {task.status !== "Waiting" && task.status !== "Done" ? (
                    <button className="secondary-button" type="button" onClick={() => onMoveTaskWaiting(task.id)}>
                      Wait
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>{task.project || "Inbox"}</Tag>
                <Tag tone={task.priority === "P1" ? "red" : task.priority === "P2" ? "blue" : "gray"}>{task.priority}</Tag>
                <Tag>{task.effort}</Tag>
                {task.due ? <Tag>Due {formatDate(task.due)}</Tag> : null}
                {task.status === "Waiting" ? <Tag tone="amber">Waiting</Tag> : null}
              </div>
            </div>
          </article>
      ))}
    </div>
  );
}

function TopicList({
  topics,
  expandedTopicNotes,
  emptyText,
  onToggleTopicNotes,
  onEditTopic,
  onMakeTask,
  onDeleteTopic,
}: {
  topics: Topic[];
  expandedTopicNotes: Set<string>;
  emptyText: string;
  onToggleTopicNotes: (id: string) => void;
  onEditTopic: (topic: Topic) => void;
  onMakeTask: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
}) {
  if (!topics.length) return <EmptyState text={emptyText} />;
  return (
    <div className="grid gap-3">
      {topics.map((topic) => {
        const isExpanded = expandedTopicNotes.has(topic.id);
        const previewPage = topicPreviewPage(topic);
        const previewNotes = previewPage?.notes || "";
        const hasMoreNotes = previewNotes && (previewNotes.length > 420 || previewNotes.split(/\r?\n/).length > 4);
        return (
          <article key={topic.id} className="grid min-w-0 gap-3 rounded-lg border border-[#c5d9ee] bg-white p-4 [overflow-wrap:anywhere]">
            <div className="min-w-0">
              <h3 className="font-semibold leading-snug">{topic.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>{topic.project || "Inbox"}</Tag>
                <Tag>{topic.pages.length} page{topic.pages.length === 1 ? "" : "s"}</Tag>
                <Tag tone="blue">Updated {formatDate((topic.updatedAt || topic.createdAt).slice(0, 10))}</Tag>
              </div>
              {previewNotes ? (
                <div className={isExpanded ? "note-preview mt-3" : "note-preview compact mt-3"}>
                  {topic.pages.length > 1 ? <p className="mb-2 text-xs font-bold uppercase text-[#53635c]">{previewPage?.title}</p> : null}
                  <NotePreview text={previewNotes} maxLines={isExpanded ? Infinity : 4} />
                </div>
              ) : null}
              {hasMoreNotes ? (
                <button className="mt-2 text-sm font-bold text-[#0b6b5c]" type="button" onClick={() => onToggleTopicNotes(topic.id)}>
                  {isExpanded ? "Less notes" : "More notes"}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button className="secondary-button" type="button" onClick={() => onEditTopic(topic)}>
                Edit
              </button>
              <button className="secondary-button" type="button" onClick={() => onMakeTask(topic)}>
                Make task
              </button>
              <button className="danger-button" type="button" onClick={() => onDeleteTopic(topic.id)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MeetingEditor({
  draft,
  projects,
  onChange,
  onSave,
  onDelete,
  onPullTasks,
  onMakeTopic,
}: {
  draft: Meeting;
  projects: string[];
  onChange: (patch: Partial<Meeting>) => void;
  onSave: () => void;
  onDelete: () => void;
  onPullTasks: () => void;
  onMakeTopic: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(!draft.notes.trim());
  const detailsSummary = [
    formatDate(draft.date),
    draft.start ? formatTime(draft.start) : "",
    draft.project,
    draft.location,
    draft.attendees ? "Attendees" : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <LabeledInput label="Title" value={draft.title} onChange={(value) => onChange({ title: value })} autoFocus />
      <RichTextEditor label="Notes" value={draft.notes} onChange={(notes) => onChange({ notes })} minHeightClass="min-h-[18rem]" />
      <details
        className="rounded-lg border border-[#d9e1dd] bg-[#fbfcfc] p-3 text-sm text-[#53635c]"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer font-bold text-[#17201c]">
          Details{detailsSummary ? <span className="ml-2 font-semibold text-[#53635c]">{detailsSummary}</span> : null}
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <LabeledInput label="Project" value={draft.project} onChange={(value) => onChange({ project: value })} list="project-options" />
          <LabeledInput label="Date" type="date" value={draft.date} onChange={(value) => onChange({ date: value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Start" type="time" value={draft.start} onChange={(value) => onChange({ start: value })} />
            <LabeledInput label="End" type="time" value={draft.end} onChange={(value) => onChange({ end: value })} />
          </div>
          <LabeledInput label="Location" value={draft.location} onChange={(value) => onChange({ location: value })} />
          <LabeledInput label="Attendees" value={draft.attendees} onChange={(value) => onChange({ attendees: value })} />
        </div>
      </details>
      <datalist id="project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="danger-button w-full sm:w-auto" type="button" onClick={onDelete}>
          Delete
        </button>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex sm:w-auto sm:flex-wrap">
          <button className="secondary-button" type="button" onClick={onMakeTopic} disabled={!draft.notes.trim()}>
            Copy to topic
          </button>
          <button className="secondary-button" type="button" onClick={onPullTasks}>
            Save and pull tasks
          </button>
          <button className="primary-button" type="submit">
            Save meeting
          </button>
        </div>
      </div>
    </form>
  );
}

function TaskEditor({
  draft,
  projects,
  onChange,
  onSave,
  onDelete,
}: {
  draft: Task;
  projects: string[];
  onChange: (patch: Partial<Task>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <LabeledInput label="Title" value={draft.title} onChange={(value) => onChange({ title: value })} autoFocus />
        <LabeledInput label="Project" value={draft.project} onChange={(value) => onChange({ project: value })} list="task-project-options" />
        <SelectField label="Status" value={draft.status} values={TASK_STATUSES} onChange={(value) => onChange({ status: value as TaskStatus })} />
        <SelectField label="Priority" value={draft.priority} values={TASK_PRIORITIES} onChange={(value) => onChange({ priority: value as TaskPriority })} />
        <SelectField label="Effort" value={draft.effort} values={TASK_EFFORTS} onChange={(value) => onChange({ effort: value as TaskEffort })} />
        <LabeledInput label="Due" type="date" value={draft.due} onChange={(value) => onChange({ due: value })} />
      </div>
      <datalist id="task-project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <RichTextEditor label="Notes" value={draft.notes} onChange={(notes) => onChange({ notes })} minHeightClass="min-h-[7rem]" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="danger-button w-full sm:w-auto" type="button" onClick={onDelete}>
          Delete
        </button>
        <button className="primary-button w-full sm:w-auto" type="submit">
          Save task
        </button>
      </div>
    </form>
  );
}

function TopicEditor({
  draft,
  projects,
  onChange,
  onSave,
  onDelete,
}: {
  draft: Topic;
  projects: string[];
  onChange: (patch: Partial<Topic>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id || "");
  const activePage = draft.pages.find((page) => page.id === activePageId) || draft.pages[0];

  function updatePages(pages: TopicPage[]) {
    onChange({ pages, notes: pages[0]?.notes || "" });
  }

  function updateActivePage(patch: Partial<TopicPage>) {
    if (!activePage) return;
    const now = new Date().toISOString();
    updatePages(draft.pages.map((page) => (page.id === activePage.id ? { ...page, ...patch, updatedAt: now } : page)));
  }

  function addPage() {
    const page = blankTopicPage(`Page ${draft.pages.length + 1}`);
    updatePages([...draft.pages, page]);
    setActivePageId(page.id);
  }

  function removeActivePage() {
    if (!activePage || draft.pages.length <= 1) return;
    if (!confirm(`Remove "${activePage.title || "this page"}"?`)) return;
    const activeIndex = draft.pages.findIndex((page) => page.id === activePage.id);
    const pages = draft.pages.filter((page) => page.id !== activePage.id);
    updatePages(pages);
    setActivePageId(pages[Math.min(activeIndex, pages.length - 1)].id);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <LabeledInput label="Topic" value={draft.title} onChange={(value) => onChange({ title: value })} autoFocus />
        <LabeledInput label="Project" value={draft.project} onChange={(value) => onChange({ project: value })} list="topic-project-options" />
      </div>
      <datalist id="topic-project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <div className="grid min-w-0 gap-4 border-t border-[#d9e1dd] pt-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[#d9e1dd] pb-4 lg:border-r lg:border-b-0 lg:pr-4 lg:pb-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#53635c]">Pages</h3>
            <button className="secondary-button" type="button" onClick={addPage}>
              New page
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {draft.pages.map((page, index) => {
              const isActive = page.id === activePage?.id;
              return (
                <button
                  key={page.id}
                  className={`min-w-40 rounded-md border px-3 py-2 text-left text-sm lg:min-w-0 ${
                    isActive
                      ? "border-[#0b6b5c] bg-[#e8f4f0] text-[#12483f]"
                      : "border-[#d9e1dd] bg-white text-[#53635c] hover:border-[#9eb9af]"
                  }`}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActivePageId(page.id)}
                >
                  <span className="block truncate font-semibold">{page.title || `Page ${index + 1}`}</span>
                  <span className="mt-1 block text-xs">{page.notes.trim() ? noteWordCount(page.notes) : "Empty"}</span>
                </button>
              );
            })}
          </div>
        </aside>
        {activePage ? (
          <section className="grid min-w-0 content-start gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <LabeledInput label="Page title" value={activePage.title} onChange={(title) => updateActivePage({ title })} />
              </div>
              <button
                className="danger-button w-full sm:w-auto"
                type="button"
                disabled={draft.pages.length <= 1}
                title={draft.pages.length <= 1 ? "A topic needs at least one page" : "Remove this page"}
                onClick={removeActivePage}
              >
                Remove page
              </button>
            </div>
            <RichTextEditor
              label="Page notes"
              value={activePage.notes}
              onChange={(notes) => updateActivePage({ notes })}
              minHeightClass="min-h-[22rem]"
            />
          </section>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="danger-button w-full sm:w-auto" type="button" onClick={onDelete}>
          Delete
        </button>
        <button className="primary-button w-full sm:w-auto" type="submit">
          Save topic
        </button>
      </div>
    </form>
  );
}

function BulkTaskEditor({
  suggestions,
  message,
  projects,
  onChange,
  onRemove,
  onSave,
}: {
  suggestions: TaskSuggestion[];
  message: string;
  projects: string[];
  onChange: (index: number, patch: Partial<TaskSuggestion>) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
}) {
  const hasBlankTitle = suggestions.some((suggestion) => !suggestion.title.trim());

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="text-sm text-[#53635c]">{message}</p>
      {suggestions.length ? (
        <div className="grid gap-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={`pulled-task-${index}`}
              className="grid gap-3 rounded-lg border border-[#d9e1dd] bg-[#fbfcfc] p-3 lg:grid-cols-[minmax(240px,1fr)_minmax(180px,0.65fr)_minmax(130px,0.35fr)_auto] lg:items-end"
            >
              <LabeledInput
                label={`Title ${index + 1}`}
                value={suggestion.title}
                autoFocus={index === 0}
                onChange={(title) => onChange(index, { title })}
              />
              <LabeledInput
                label="Project"
                value={suggestion.project}
                list="bulk-task-project-options"
                onChange={(project) => onChange(index, { project })}
              />
              <SelectField
                label="Status"
                value={suggestion.status}
                values={TASK_STATUSES}
                onChange={(status) => onChange(index, { status: status as TaskStatus })}
              />
              <button className="danger-button" type="button" onClick={() => onRemove(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[#cfd9d4] bg-[#fbfcfc] p-4 text-sm font-semibold text-[#53635c]">
          Nothing to create yet.
        </div>
      )}
      <datalist id="bulk-task-project-options">
        {[...new Set([...projects, ...suggestions.map((suggestion) => suggestion.project), "Inbox"].filter(Boolean))].sort().map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={!suggestions.length || hasBlankTitle}>
          Create {suggestions.length || "all"} task{suggestions.length === 1 ? "" : "s"}
        </button>
      </div>
    </form>
  );
}

function NotePreview({ text, maxLines = Infinity }: { text: string; maxLines?: number }) {
  const nodes = buildNoteNodes(text, maxLines);
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "hr") return <hr key={index} className="my-3 border-[#d9e1dd]" />;
        if (node.type === "h") {
          const className = "mt-3 text-base font-semibold first:mt-0";
          if (node.level === 4) {
            return (
              <h4 key={index} className={className}>
                <InlineNoteText text={node.text} />
              </h4>
            );
          }
          if (node.level === 5) {
            return (
              <h5 key={index} className={className}>
                <InlineNoteText text={node.text} />
              </h5>
            );
          }
          return (
            <h6 key={index} className={className}>
              <InlineNoteText text={node.text} />
            </h6>
          );
        }
        if (node.type === "ul") {
          return (
            <ul key={index} className="my-2 list-disc space-y-1 pl-5">
              {node.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {item.task ? <strong>Task: </strong> : null}
                  <InlineNoteText text={item.text} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="my-2 first:mt-0 last:mb-0">
            <InlineNoteText text={node.text} />
          </p>
        );
      })}
    </>
  );
}

function InlineNoteText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}

function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm sm:p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Modal({
  title,
  children,
  headerActions,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 px-2 py-3 sm:px-4 sm:py-6">
      <section
        className="mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-lg border border-[#d9e1dd] bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#d9e1dd] p-4 sm:p-5">
          <h2 id={titleId} className="min-w-0 text-xl font-semibold [overflow-wrap:anywhere]">{title}</h2>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {headerActions}
            <button className="ghost-button" type="button" onClick={onClose} aria-label="Close">
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  autoFocus = false,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
  list?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
      {label}
      <input
        className="field"
        type={type}
        value={value}
        list={list}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
      {label}
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileButton({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="secondary-button cursor-pointer">
      {label}
      <input className="sr-only" type="file" accept={accept} onChange={onChange} />
    </label>
  );
}

function RichTextEditor({
  label,
  value,
  onChange,
  minHeightClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeightClass: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const [activeTools, setActiveTools] = useState<Partial<Record<NoteTool, boolean>>>({});

  const syncFromDom = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const markdown = editorHtmlToMarkdown(editor);
    setEditorMarkdownDataset(editor, markdown);
    onChange(markdown);
  }, [onChange]);

  const refreshToolbarState = useCallback(() => {
    const editor = editorRef.current;
    if (typeof document === "undefined" || !editor || !editorHasSelection(editor)) {
      setActiveTools({});
      return;
    }
    const listItem = currentListItem(editor);
    const formatBlock = String(document.queryCommandValue("formatBlock") || "")
      .replace(/[<>]/g, "")
      .toLowerCase();
    setActiveTools({
      bold: document.queryCommandState("bold"),
      bullet: document.queryCommandState("insertUnorderedList"),
      heading: ["h1", "h2", "h3", "h4", "h5", "h6"].includes(formatBlock),
      task: listItem?.dataset.task === "true",
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor && editor.dataset.lastMarkdown === value) return;
    editor.innerHTML = markdownToEditorHtml(value);
    setEditorMarkdownDataset(editor, value);
  }, [value]);

  function runCommand(tool: NoteTool) {
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;
    editor.focus();

    if (tool === "bold") {
      document.execCommand("bold");
    } else if (tool === "bullet") {
      document.execCommand("insertUnorderedList");
    } else if (tool === "heading") {
      const isHeading = activeTools.heading;
      document.execCommand("formatBlock", false, isHeading ? "P" : "H4");
    } else if (tool === "divider") {
      document.execCommand("insertHorizontalRule");
    } else if (tool === "task") {
      let item = currentListItem(editor);
      if (!item) {
        document.execCommand("insertUnorderedList");
        item = currentListItem(editor);
      }
      if (item) item.dataset.task = item.dataset.task === "true" ? "false" : "true";
    }

    syncFromDom();
    refreshToolbarState();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncFromDom();
    refreshToolbarState();
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-[#53635c]">
      <span id={labelId}>{label}</span>
      <div className="overflow-hidden rounded-lg border border-[#cfd9d4] bg-white focus-within:border-[#0b6b5c]">
        <div className="flex flex-wrap gap-1 border-b border-[#d9e1dd] bg-[#f7f9f8] p-2">
          {[
            ["bold", "B", "Bold"],
            ["bullet", "Bullet", "Bulleted list"],
            ["task", "Task", "Task line"],
            ["heading", "H", "Heading"],
            ["divider", "Rule", "Divider"],
          ].map(([tool, text, title]) => (
            <button
              key={tool}
              className={activeTools[tool as NoteTool] ? "editor-tool active" : "editor-tool"}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={Boolean(activeTools[tool as NoteTool])}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(tool as NoteTool)}
            >
              {text}
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          className={`rich-editor ${minHeightClass}`}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          data-placeholder="Start typing..."
          suppressContentEditableWarning
          onInput={() => {
            syncFromDom();
            refreshToolbarState();
          }}
          onKeyUp={refreshToolbarState}
          onMouseUp={refreshToolbarState}
          onFocus={refreshToolbarState}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
}

function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "red" | "blue" | "amber" }) {
  const toneClass = {
    gray: "border-[#d9e1dd] bg-[#f7f9f8] text-[#53635c]",
    red: "border-[#f0b8b1] bg-[#ffe3df] text-[#8f2424]",
    blue: "border-[#c5d9ee] bg-[#e1effb] text-[#235d91]",
    amber: "border-[#ead294] bg-[#fff0ce] text-[#7a4d00]",
  }[tone];
  return <span className={`max-w-full rounded-full border px-2.5 py-1 text-xs font-bold [overflow-wrap:anywhere] ${toneClass}`}>{children}</span>;
}

function StatusDot({ label, tone }: { label: string; tone: "good" | "wait" | "bad" }) {
  const color = tone === "good" ? "bg-[#0b6b5c]" : tone === "wait" ? "bg-[#8a5a00]" : "bg-[#9f2b2b]";
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-[#53635c]">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#cfd9d4] bg-[#fbfcfc] p-5 text-sm font-semibold text-[#53635c]">{text}</div>;
}

function ShellMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7f6] px-4 text-[#17201c]">
      <section className="rounded-lg border border-[#d9e1dd] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-[#53635c]">{body}</p>
      </section>
    </main>
  );
}

type NoteTool = "bold" | "bullet" | "task" | "heading" | "divider";

type NoteNode =
  | { type: "p"; text: string }
  | { type: "h"; level: number; text: string }
  | { type: "hr" }
  | { type: "ul"; items: { text: string; task: boolean }[] };

function markdownToEditorHtml(text: string) {
  const nodes = buildNoteNodes(text, Infinity);
  if (!nodes.length) return "<p><br></p>";
  return nodes
    .map((node) => {
      if (node.type === "hr") return "<hr>";
      if (node.type === "h") return `<h${node.level}>${inlineMarkdownToHtml(node.text)}</h${node.level}>`;
      if (node.type === "ul") {
        const items = node.items
          .map((item) => `<li${item.task ? ' data-task="true"' : ""}>${inlineMarkdownToHtml(item.text) || "<br>"}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMarkdownToHtml(node.text) || "<br>"}</p>`;
    })
    .join("");
}

function editorHtmlToMarkdown(root: HTMLElement) {
  const lines = Array.from(root.childNodes).flatMap((node) => blockNodeToMarkdown(node));
  return trimEmptyEdges(lines).join("\n");
}

function blockNodeToMarkdown(node: ChildNode): string[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeEditorWhitespace(node.textContent || "");
    return text ? [text] : [];
  }

  if (!(node instanceof HTMLElement)) return [];
  const tag = node.tagName.toLowerCase();

  if (tag === "br") return [""];
  if (tag === "hr") return ["---"];
  if (tag === "ul" || tag === "ol") {
    return Array.from(node.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName.toLowerCase() === "li")
      .map((item) => `${item.dataset.task === "true" ? "task - " : "- "}${inlineNodeToMarkdown(item).trim()}`)
      .filter((line) => line.trim() !== "-" && line.trim() !== "task -");
  }
  if (/^h[1-6]$/.test(tag)) {
    const text = inlineNodeToMarkdown(node).trim();
    return text ? [`## ${text}`] : [];
  }
  if (tag === "div" || tag === "p") {
    const childBlocks = Array.from(node.childNodes).flatMap((child) => {
      if (child instanceof HTMLElement && ["ul", "ol", "hr"].includes(child.tagName.toLowerCase())) return blockNodeToMarkdown(child);
      return [];
    });
    if (childBlocks.length) return childBlocks;
    const text = inlineNodeToMarkdown(node).trim();
    return text ? [text] : [""];
  }
  if (tag === "li") {
    const text = inlineNodeToMarkdown(node).trim();
    return text ? [`${node.dataset.task === "true" ? "task - " : "- "}${text}`] : [];
  }

  const text = inlineNodeToMarkdown(node).trim();
  return text ? [text] : [];
}

function inlineNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return normalizeEditorWhitespace(node.textContent || "");
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") {
    const text = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("").trim();
    return text ? `**${text}**` : "";
  }
  if (tag === "ul" || tag === "ol" || tag === "hr") return "";
  return Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");
}

function inlineMarkdownToHtml(text: string) {
  return escapeEditorHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapeEditorHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char] || char));
}

function normalizeEditorWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
}

function trimEmptyEdges(lines: string[]) {
  const next = [...lines];
  while (next.length && !next[0].trim()) next.shift();
  while (next.length && !next[next.length - 1].trim()) next.pop();
  return next;
}

function setEditorMarkdownDataset(editor: HTMLElement, markdown: string) {
  editor.dataset.lastMarkdown = markdown;
  editor.dataset.empty = markdown.trim() ? "false" : "true";
}

function editorHasSelection(editor: HTMLElement) {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection?.anchorNode) return document.activeElement === editor;
  return editor.contains(selection.anchorNode);
}

function currentListItem(editor: HTMLElement | null) {
  if (!editor || typeof window === "undefined") return null;
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  if (!node || !editor.contains(node)) return null;
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest("li") as HTMLLIElement | null;
}

function buildNoteNodes(text: string, maxLines: number): NoteNode[] {
  const nodes: NoteNode[] = [];
  let currentList: { text: string; task: boolean }[] | null = null;

  const flushList = () => {
    if (currentList?.length) nodes.push({ type: "ul", items: currentList });
    currentList = null;
  };

  String(text || "")
    .split(/\r?\n/)
    .slice(0, maxLines)
    .forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        flushList();
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const bullet = line.match(/^[-*]\s+(.+)$/);
      const taskTitle = markedTaskTitle(line);

      if (heading) {
        flushList();
        nodes.push({ type: "h", level: Math.min(heading[1].length + 3, 6), text: heading[2] });
        return;
      }

      if (bullet || taskTitle !== null) {
        if (!currentList) currentList = [];
        currentList.push({ text: (bullet ? bullet[1] : taskTitle) || "", task: taskTitle !== null });
        return;
      }

      if (line === "---") {
        flushList();
        nodes.push({ type: "hr" });
        return;
      }

      flushList();
      nodes.push({ type: "p", text: line });
    });

  flushList();
  return nodes;
}

function normalizeLoadedState(raw: unknown): AppState {
  const source = raw && typeof raw === "object" ? (raw as Partial<AppState> & { notes?: unknown }) : EMPTY_STATE;
  const legacyMeetings = Array.isArray(source.notes)
    ? source.notes
        .map((note) => {
          if (!note || typeof note !== "object") return null;
          const data = note as Partial<Meeting> & { content?: unknown };
          return normalizeMeeting({
            ...data,
            notes: typeof data.content === "string" ? data.content : data.notes,
          });
        })
        .filter((meeting): meeting is Meeting => Boolean(meeting))
    : [];

  return {
    meetings: [...(Array.isArray(source.meetings) ? source.meetings : []), ...legacyMeetings].map(normalizeMeeting),
    tasks: (Array.isArray(source.tasks) ? source.tasks : []).map(normalizeTask),
    topics: (Array.isArray(source.topics) ? source.topics : []).map(normalizeTopic),
    notes: [],
    imports: Array.isArray(source.imports) ? source.imports.filter((item): item is string => typeof item === "string") : [],
  };
}

function normalizeMeeting(raw: Partial<Meeting>): Meeting {
  const now = new Date().toISOString();
  return {
    id: cleanText(raw.id) || createId(),
    calendarUid: cleanText(raw.calendarUid),
    title: cleanText(raw.title) || "Untitled meeting",
    project: cleanText(raw.project),
    date: dateOnly(raw.date) || todayIso(),
    start: cleanText(raw.start),
    end: cleanText(raw.end),
    location: cleanText(raw.location),
    attendees: cleanText(raw.attendees),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    createdAt: cleanText(raw.createdAt) || now,
    updatedAt: cleanText(raw.updatedAt) || cleanText(raw.createdAt) || now,
  };
}

function normalizeTask(raw: Partial<Task>): Task {
  const now = new Date().toISOString();
  return {
    id: cleanText(raw.id) || createId(),
    title: cleanText(raw.title),
    project: cleanText(raw.project) || "Inbox",
    status: pickValue(raw.status, TASK_STATUSES, "Inbox"),
    priority: pickValue(raw.priority, TASK_PRIORITIES, "P2"),
    effort: pickValue(raw.effort, TASK_EFFORTS, "Quick"),
    energy: pickValue(raw.energy, TASK_ENERGIES, "Normal"),
    context: pickValue(raw.context, TASK_CONTEXTS, "Follow-up"),
    owner: cleanText(raw.owner),
    due: dateOnly(raw.due),
    notes: cleanText(raw.notes),
    meetingId: cleanText(raw.meetingId),
    createdAt: cleanText(raw.createdAt) || now,
    completedAt: cleanText(raw.completedAt),
  };
}

function normalizeTopic(raw: Partial<Topic>): Topic {
  const now = new Date().toISOString();
  const id = cleanText(raw.id) || createId();
  const legacyNotes = cleanText(raw.notes);
  const pages = Array.isArray(raw.pages)
    ? raw.pages
        .filter((page): page is TopicPage => Boolean(page && typeof page === "object"))
        .map((page, index) => normalizeTopicPage(page, `Page ${index + 1}`))
    : [];
  const normalizedPages = pages.length
    ? pages
    : [{
        id: `${id}:notes`,
        title: "Notes",
        notes: legacyNotes,
        createdAt: cleanText(raw.createdAt) || now,
        updatedAt: cleanText(raw.updatedAt) || cleanText(raw.createdAt) || now,
      }];
  return {
    id,
    title: cleanText(raw.title),
    project: cleanText(raw.project) || "Inbox",
    notes: normalizedPages[0]?.notes || legacyNotes,
    pages: normalizedPages,
    createdAt: cleanText(raw.createdAt) || now,
    updatedAt: cleanText(raw.updatedAt) || cleanText(raw.createdAt) || now,
  };
}

function normalizeTopicPage(raw: Partial<TopicPage>, fallbackTitle: string): TopicPage {
  const now = new Date().toISOString();
  return {
    id: cleanText(raw.id) || createId(),
    title: cleanText(raw.title) || fallbackTitle,
    notes: cleanText(raw.notes),
    createdAt: cleanText(raw.createdAt) || now,
    updatedAt: cleanText(raw.updatedAt) || cleanText(raw.createdAt) || now,
  };
}

function blankMeeting(date: string): Meeting {
  const now = new Date().toISOString();
  return {
    id: createId(),
    calendarUid: "",
    title: "",
    project: "",
    date: dateOnly(date) || todayIso(),
    start: "",
    end: "",
    location: "",
    attendees: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function blankTask(project: string): Task {
  return {
    id: createId(),
    title: "",
    project,
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    notes: "",
    meetingId: "",
    createdAt: new Date().toISOString(),
    completedAt: "",
  };
}

function blankTopic(project: string): Topic {
  const now = new Date().toISOString();
  const page = blankTopicPage("Notes");
  return {
    id: createId(),
    title: "",
    project,
    notes: "",
    pages: [page],
    createdAt: now,
    updatedAt: now,
  };
}

function blankTopicPage(title: string, notes = ""): TopicPage {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

function draftSnapshot(draft: Meeting | Task | Topic) {
  return JSON.stringify(draft);
}

function confirmDiscardChanges(draft: Meeting | Task | Topic, baseline: string) {
  return draftSnapshot(draft) === baseline || confirm("You have unsaved changes. Close without saving?");
}

function parseIcsMeetings(text: string): Meeting[] {
  return unfoldIcs(text)
    .split(/\r?\nBEGIN:VEVENT\r?\n|\r?\nBEGIN:VEVENT\r?\n/)
    .slice(1)
    .map((chunk) => chunk.split(/\r?\nEND:VEVENT/)[0])
    .map(parseIcsEvent)
    .filter((meeting): meeting is Meeting => Boolean(meeting));
}

type IcsProperty = {
  value: string;
  params: Record<string, string>;
};

function parseIcsEvent(eventText: string): Meeting | null {
  const props: Record<string, IcsProperty[]> = {};
  const attendees: string[] = [];
  const lines = eventText.split(/\r?\n/).filter(Boolean);

  lines.forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const rawKey = line.slice(0, separator);
    const value = decodeIcsText(line.slice(separator + 1));
    const [name, ...paramParts] = rawKey.split(";");
    const key = name.toUpperCase();
    const params = parseIcsParams(paramParts);
    if (key === "ATTENDEE") {
      attendees.push(params.CN || value.replace(/^mailto:/i, ""));
      return;
    }
    props[key] = [...(props[key] || []), { value, params }];
  });

  const uid = firstIcsValue(props, "UID") || createId();
  const start = parseIcsDateTime(props.DTSTART?.[0]);
  const end = parseIcsDateTime(props.DTEND?.[0]);
  if (!start.date) return null;
  const instanceUid = calendarInstanceUid(uid, start.date, start.time);

  return {
    id: `ics-${slugify(instanceUid)}`,
    calendarUid: instanceUid,
    title: firstIcsValue(props, "SUMMARY") || "Imported calendar event",
    project: "",
    date: start.date,
    start: start.time,
    end: end.time,
    location: firstIcsValue(props, "LOCATION"),
    attendees: attendees.join(", "),
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseIcsDateTime(prop?: IcsProperty) {
  if (!prop) return { date: "", time: "" };
  const value = prop.value;
  if (prop.params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: "" };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return { date: "", time: "" };

  if (value.endsWith("Z")) {
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00Z`);
    return {
      date: localDateIso(date),
      time: date.toTimeString().slice(0, 5),
    };
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

function parseIcsParams(paramParts: string[]) {
  return paramParts.reduce<Record<string, string>>((params, part) => {
    const [key, ...valueParts] = part.split("=");
    if (!key) return params;
    params[key.toUpperCase()] = valueParts.join("=").replace(/^"|"$/g, "");
    return params;
  }, {});
}

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function firstIcsValue(props: Record<string, IcsProperty[]>, key: string) {
  return props[key]?.[0]?.value || "";
}

function importedMeetingKey(meeting: Meeting) {
  const calendarUid = cleanText(meeting.calendarUid);
  if (!calendarUid) return meeting.id;
  if (calendarUid.includes("::")) return calendarUid;
  return calendarInstanceUid(calendarUid, meeting.date, meeting.start);
}

function calendarInstanceUid(uid: string, date: string, start: string) {
  return [uid, dateOnly(date) || "no-date", cleanText(start) || "all-day"].join("::");
}

function decodeIcsText(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function groupTasksByProject(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const project = task.project || "Inbox";
    groups.set(project, [...(groups.get(project) || []), task]);
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function meetingDayToneMap(meetings: Meeting[]) {
  const dates = new Map<string, number>();
  meetings.forEach((meeting) => {
    if (!dates.has(meeting.date)) dates.set(meeting.date, dates.size % MEETING_DAY_TONES.length);
  });
  return dates;
}

function groupMeetingsByDate(meetings: Meeting[]) {
  const groups = new Map<string, Meeting[]>();
  meetings.forEach((meeting) => {
    const group = groups.get(meeting.date);
    if (group) group.push(meeting);
    else groups.set(meeting.date, [meeting]);
  });
  return [...groups.entries()];
}

function sortTasksForDisplay(left: Task, right: Task) {
  if (left.status === "Done" && right.status !== "Done") return 1;
  if (left.status !== "Done" && right.status === "Done") return -1;
  const priorityOrder = { P1: 0, P2: 1, P3: 2 };
  const priorityDelta = priorityOrder[left.priority] - priorityOrder[right.priority];
  if (priorityDelta) return priorityDelta;
  return (right.completedAt || right.createdAt || "").localeCompare(left.completedAt || left.createdAt || "");
}

function sortTopicsForDisplay(left: Topic, right: Topic) {
  return (right.updatedAt || right.createdAt || "").localeCompare(left.updatedAt || left.createdAt || "");
}

function topicPreviewPage(topic: Topic) {
  const pagesWithNotes = topic.pages.filter((page) => page.notes.trim());
  return [...pagesWithNotes].sort((left, right) =>
    (right.updatedAt || right.createdAt || "").localeCompare(left.updatedAt || left.createdAt || ""),
  )[0] || topic.pages[0];
}

function noteWordCount(notes: string) {
  const count = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  return `${count} word${count === 1 ? "" : "s"}`;
}

function priorityBorder(priority: TaskPriority) {
  if (priority === "P1") return "border-[#f0b8b1]";
  if (priority === "P2") return "border-[#c5d9ee]";
  return "border-[#d9e1dd]";
}

function meetingDateTime(meeting: Meeting) {
  return `${meeting.date || "9999-12-31"}T${meeting.start || "23:59"}`;
}

function formatDate(dateString: string) {
  const normalizedDate = dateOnly(dateString);
  if (!normalizedDate) return "No date";
  const date = safeDate(`${normalizedDate}T12:00:00`);
  if (!date) return normalizedDate;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  } catch {
    return normalizedDate;
  }
}

function formatMeetingDayHeading(dateString: string) {
  const normalizedDate = dateOnly(dateString);
  if (!normalizedDate) return { weekday: "Date unavailable", date: "No date" };
  const date = safeDate(`${normalizedDate}T12:00:00`);
  if (!date) return { weekday: "Date unavailable", date: normalizedDate };
  try {
    return {
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
      date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date),
    };
  } catch {
    return { weekday: "Meeting day", date: normalizedDate };
  }
}

function formatTime(timeString: string) {
  if (!timeString) return "";
  const [hour, minute] = timeString.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timeString;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  } catch {
    return timeString;
  }
}

function todayIso() {
  return localDateIso(new Date());
}

function recentMeetingCutoff() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return localDateIso(cutoff);
}

function localDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value: string) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || createId();
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateOnly(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cleanText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = safeDate(text);
  return date ? date.toISOString().slice(0, 10) : "";
}

function pickValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
