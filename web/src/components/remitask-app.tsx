"use client";

import {
  ChangeEvent,
  Component,
  ErrorInfo,
  FormEvent,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
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
} from "@/lib/types";

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

type ActiveTab = "dashboard" | "meetings" | "tasks";
type TaskView = "today" | "next" | "waiting" | "projects" | "done";
type SaveStatus = "Loaded" | "Saving..." | "Saved" | "Save failed";
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
  const [taskView, setTaskView] = useState<TaskView>("today");
  const [taskSearch, setTaskSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [meetingDraft, setMeetingDraft] = useState<Meeting | null>(null);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [topicDraft, setTopicDraft] = useState<Topic | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());
  const [expandedTopicNotes, setExpandedTopicNotes] = useState<Set<string>>(() => new Set());
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [suggestionMeeting, setSuggestionMeeting] = useState<Meeting | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState("No suggestions yet.");
  const [isExtracting, setIsExtracting] = useState(false);
  const [icsStatus, setIcsStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const appStateRef = useRef(appState);
  const saveQueueRef = useRef(Promise.resolve());
  const saveGenerationRef = useRef(0);
  const meetingNotesRef = useRef<HTMLTextAreaElement>(null);
  const topicNotesRef = useRef<HTMLTextAreaElement>(null);

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

  const allTopics = useMemo(() => {
    return [...appState.topics].sort(sortTopicsForDisplay);
  }, [appState.topics]);

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
        const haystack = [task.title, task.project, task.notes, task.owner].join(" ").toLowerCase();
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
    setMeetingDraft(meeting ? { ...meeting } : blankMeeting(selectedDate));
    setActiveTab("meetings");
  }

  function closeMeetingEditor() {
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
    setMeetingDraft(savedMeeting);
    if (options.close !== false) setMeetingDraft(null);
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
    if (meetingDraft?.id === id) setMeetingDraft(null);
    if (suggestionMeeting?.id === id) {
      setSuggestions([]);
      setSuggestionMeeting(null);
      setSuggestionMessage("No suggestions yet.");
    }
  }

  async function extractForMeeting(meeting: Meeting) {
    const savedMeeting = appStateRef.current.meetings.find((item) => item.id === meeting.id) || meeting;
    setActiveTab("meetings");
    setSuggestionMeeting(savedMeeting);
    setSuggestions([]);
    setSuggestionMessage("Extracting tasks...");
    setIsExtracting(true);

    try {
      const response = await fetch("/api/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting: savedMeeting, projects }),
      });
      if (!response.ok) throw new Error("AI extraction unavailable.");
      const body = (await response.json()) as { tasks?: TaskSuggestion[] };
      const remoteSuggestions = Array.isArray(body.tasks) ? body.tasks : [];
      setSuggestions(remoteSuggestions.map((suggestion) => normalizeSuggestion(suggestion, savedMeeting)));
      setSuggestionMessage("AI found no tasks in these notes.");
    } catch {
      const localSuggestions = extractSuggestionsLocally(savedMeeting);
      setSuggestions(localSuggestions);
      setSuggestionMessage(
        localSuggestions.length
          ? "AI extraction is unavailable, so these suggestions came from the local fallback."
          : "AI extraction is unavailable, and the fallback found no task-like lines.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function saveDraftAndExtract() {
    const savedMeeting = saveMeetingDraft({ close: false });
    if (savedMeeting) await extractForMeeting(savedMeeting);
  }

  function addSelectedSuggestions() {
    const now = new Date().toISOString();
    const newTasks: Task[] = suggestions
      .filter((suggestion) => suggestion.selected && suggestion.title.trim())
      .map((suggestion) => ({
        id: createId(),
        title: suggestion.title.trim(),
        project: suggestion.project,
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
    setSuggestions([]);
    setSuggestionMessage(`Added ${newTasks.length} task${newTasks.length === 1 ? "" : "s"}.`);
  }

  function openTaskEditor(task?: Task) {
    setTaskDraft(task ? { ...task } : blankTask(projects[0] || "Inbox"));
  }

  function openTopicEditor(topic?: Topic) {
    setTopicDraft(topic ? { ...topic } : blankTopic(projects[0] || "Inbox"));
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
    const nextTopic: Topic = {
      ...topicDraft,
      title: topicDraft.title.trim(),
      project: topicDraft.project.trim() || "Inbox",
      notes: topicDraft.notes.trim(),
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
    setTopicDraft(null);
  }

  function deleteTopic(id: string) {
    const topic = appStateRef.current.topics.find((item) => item.id === id);
    if (!topic) return;
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
    setTopicDraft(null);
  }

  function makeTaskFromTopic(topic: Topic) {
    setTaskDraft({
      ...blankTask(topic.project || "Inbox"),
      title: topic.title,
      notes: topic.notes,
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

  function applyNoteTool(tool: NoteTool) {
    if (!meetingDraft || !meetingNotesRef.current) return;
    const textarea = meetingNotesRef.current;
    const result = applyNoteToolToValue(textarea.value, textarea.selectionStart, textarea.selectionEnd, tool);
    setMeetingDraft({ ...meetingDraft, notes: result.value });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function applyTopicNoteTool(tool: NoteTool) {
    if (!topicDraft || !topicNotesRef.current) return;
    const textarea = topicNotesRef.current;
    const result = applyNoteToolToValue(textarea.value, textarea.selectionStart, textarea.selectionEnd, tool);
    setTopicDraft({ ...topicDraft, notes: result.value });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
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
            topics={allTopics}
            expandedNotes={expandedNotes}
            expandedTopicNotes={expandedTopicNotes}
            meetingsById={meetingMap(appState.meetings)}
            onToggleNotes={toggleNotes}
            onToggleTopicNotes={toggleTopicNotes}
            onEditMeeting={openMeetingEditor}
            onExtractMeeting={extractForMeeting}
            onDeleteMeeting={deleteMeeting}
            onToggleTaskDone={toggleTaskDone}
            onEditTask={openTaskEditor}
            onEditTopic={openTopicEditor}
            onMakeTaskFromTopic={makeTaskFromTopic}
            onDeleteTopic={deleteTopic}
            onMoveTaskToday={(id) => updateTask(id, { status: "Today" })}
            onMoveTaskWaiting={(id) => updateTask(id, { status: "Waiting" })}
          />
        ) : null}

        {activeTab === "meetings" ? (
          <MeetingsView
            meetings={allMeetings}
            expandedNotes={expandedNotes}
            suggestions={suggestions}
            suggestionMeeting={suggestionMeeting}
            suggestionMessage={suggestionMessage}
            isExtracting={isExtracting}
            projects={projects}
            onNewMeeting={() => openMeetingEditor()}
            onToggleNotes={toggleNotes}
            onEditMeeting={openMeetingEditor}
            onExtractMeeting={extractForMeeting}
            onDeleteMeeting={deleteMeeting}
            onSuggestionChange={(index, patch) =>
              setSuggestions((current) => current.map((suggestion, itemIndex) => (itemIndex === index ? { ...suggestion, ...patch } : suggestion)))
            }
            onAddSuggestions={addSelectedSuggestions}
          />
        ) : null}

        {activeTab === "tasks" ? (
          <TasksView
            tasks={visibleTasks}
            allMeetings={appState.meetings}
            projects={projects}
            projectFilter={projectFilter}
            taskSearch={taskSearch}
            taskView={taskView}
            onProjectFilterChange={setProjectFilter}
            onSearchChange={setTaskSearch}
            onTaskViewChange={setTaskView}
            onToggleTaskDone={toggleTaskDone}
            onEditTask={openTaskEditor}
            onMoveTaskToday={(id) => updateTask(id, { status: "Today" })}
            onMoveTaskWaiting={(id) => updateTask(id, { status: "Waiting" })}
          />
        ) : null}
      </section>

      {meetingDraft ? (
        <Modal title={meetingDraft.title || "Meeting"} onClose={closeMeetingEditor}>
          <MeetingEditor
            draft={meetingDraft}
            projects={projects}
            notesRef={meetingNotesRef}
            suggestions={suggestionMeeting?.id === meetingDraft.id ? suggestions : []}
            suggestionMessage={suggestionMeeting?.id === meetingDraft.id ? suggestionMessage : ""}
            isExtracting={isExtracting}
            onChange={(patch) => setMeetingDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={() => saveMeetingDraft()}
            onDelete={() => deleteMeeting(meetingDraft.id)}
            onExtract={saveDraftAndExtract}
            onApplyNoteTool={applyNoteTool}
            onSuggestionChange={(index, patch) =>
              setSuggestions((current) => current.map((suggestion, itemIndex) => (itemIndex === index ? { ...suggestion, ...patch } : suggestion)))
            }
            onAddSuggestions={addSelectedSuggestions}
          />
        </Modal>
      ) : null}

      {taskDraft ? (
        <Modal title={taskDraft.title || "Task"} onClose={() => setTaskDraft(null)}>
          <TaskEditor
            draft={taskDraft}
            projects={projects}
            meetings={appState.meetings}
            onChange={(patch) => setTaskDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={saveTaskDraft}
            onDelete={() => deleteTask(taskDraft.id)}
          />
        </Modal>
      ) : null}

      {topicDraft ? (
        <Modal title={topicDraft.title || "Topic"} onClose={() => setTopicDraft(null)}>
          <TopicEditor
            draft={topicDraft}
            projects={projects}
            notesRef={topicNotesRef}
            onChange={(patch) => setTopicDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={saveTopicDraft}
            onDelete={() => deleteTopic(topicDraft.id)}
            onApplyNoteTool={applyTopicNoteTool}
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
  expandedNotes,
  expandedTopicNotes,
  meetingsById,
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
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  summaryItems: (string | number)[][];
  meetings: Meeting[];
  tasks: Task[];
  topics: Topic[];
  expandedNotes: Set<string>;
  expandedTopicNotes: Set<string>;
  meetingsById: Map<string, Meeting>;
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
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryItems.map(([label, count]) => (
          <div key={String(label)} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <strong className="block text-2xl">{count}</strong>
            <span className="text-sm font-semibold text-[#53635c]">{label}</span>
          </div>
        ))}
      </section>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
        <Panel title="Calendar">
          <MeetingList
            meetings={meetings}
            expandedNotes={expandedNotes}
            emptyText="No meetings on this date."
            onToggleNotes={onToggleNotes}
            onEditMeeting={onEditMeeting}
            onExtractMeeting={onExtractMeeting}
            onDeleteMeeting={onDeleteMeeting}
          />
        </Panel>
        <Panel title="Today">
          <TaskList
            tasks={tasks}
            meetingsById={meetingsById}
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
        </Panel>
      </section>
    </div>
  );
}

function MeetingsView({
  meetings,
  expandedNotes,
  suggestions,
  suggestionMeeting,
  suggestionMessage,
  isExtracting,
  projects,
  onNewMeeting,
  onToggleNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
  onSuggestionChange,
  onAddSuggestions,
}: {
  meetings: Meeting[];
  expandedNotes: Set<string>;
  suggestions: TaskSuggestion[];
  suggestionMeeting: Meeting | null;
  suggestionMessage: string;
  isExtracting: boolean;
  projects: string[];
  onNewMeeting: () => void;
  onToggleNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  onSuggestionChange: (index: number, patch: Partial<TaskSuggestion>) => void;
  onAddSuggestions: () => void;
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
      {suggestionMeeting ? (
        <SuggestionPanel
          meeting={suggestionMeeting}
          suggestions={suggestions}
          message={suggestionMessage}
          projects={projects}
          isExtracting={isExtracting}
          onChange={onSuggestionChange}
          onAdd={onAddSuggestions}
        />
      ) : null}
      <Panel title="Calendar events">
        <MeetingList
          meetings={meetings}
          expandedNotes={expandedNotes}
          emptyText="No meetings yet."
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
  allMeetings,
  projects,
  projectFilter,
  taskSearch,
  taskView,
  onProjectFilterChange,
  onSearchChange,
  onTaskViewChange,
  onToggleTaskDone,
  onEditTask,
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  tasks: Task[];
  allMeetings: Meeting[];
  projects: string[];
  projectFilter: string;
  taskSearch: string;
  taskView: TaskView;
  onProjectFilterChange: (project: string) => void;
  onSearchChange: (search: string) => void;
  onTaskViewChange: (view: TaskView) => void;
  onToggleTaskDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  const meetingsById = meetingMap(allMeetings);
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
              <Panel key={project} title={project}>
                <TaskList
                  tasks={projectTasks}
                  meetingsById={meetingsById}
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
            meetingsById={meetingsById}
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
  onToggleNotes,
  onEditMeeting,
  onExtractMeeting,
  onDeleteMeeting,
}: {
  meetings: Meeting[];
  expandedNotes: Set<string>;
  emptyText: string;
  onToggleNotes: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onExtractMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
}) {
  if (!meetings.length) return <EmptyState text={emptyText} />;
  const dayToneByDate = meetingDayToneMap(meetings);

  return (
    <div className="grid gap-3">
      {meetings.map((meeting) => {
        const isExpanded = expandedNotes.has(meeting.id);
        const hasMoreNotes = meeting.notes && (meeting.notes.length > 420 || meeting.notes.split(/\r?\n/).length > 4);
        const details = [meeting.project, meeting.location, meeting.attendees ? `With ${meeting.attendees}` : ""].filter(Boolean).join(" / ");
        const time = meeting.start ? `${formatTime(meeting.start)}${meeting.end ? `-${formatTime(meeting.end)}` : ""}` : "Any time";
        const dayToneClass = MEETING_DAY_TONES[dayToneByDate.get(meeting.date) || 0];
        return (
          <article
            key={meeting.id}
            className={[
              "grid min-w-0 gap-3 rounded-lg border p-4 md:grid-cols-[7.5rem_minmax(0,1fr)_auto]",
              dayToneClass,
            ].join(" ")}
          >
            <div className="text-sm font-bold text-[#235d91]">
              <span className="block">{time}</span>
              <span className="block text-[#53635c]">{formatDate(meeting.date)}</span>
            </div>
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h3 className="text-base font-semibold leading-snug">{meeting.title}</h3>
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
            <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-start md:justify-end">
              <button className="secondary-button" type="button" onClick={() => onEditMeeting(meeting)}>
                Edit
              </button>
              <button className="secondary-button" type="button" onClick={() => onExtractMeeting(meeting)}>
                Extract
              </button>
              <button className="danger-button" type="button" onClick={() => onDeleteMeeting(meeting.id)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskList({
  tasks,
  meetingsById,
  emptyText,
  onToggleTaskDone,
  onEditTask,
  onMoveTaskToday,
  onMoveTaskWaiting,
}: {
  tasks: Task[];
  meetingsById: Map<string, Meeting>;
  emptyText: string;
  onToggleTaskDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onMoveTaskToday: (id: string) => void;
  onMoveTaskWaiting: (id: string) => void;
}) {
  if (!tasks.length) return <EmptyState text={emptyText} />;
  return (
    <div className="grid gap-3">
      {tasks.map((task) => {
        const meeting = task.meetingId ? meetingsById.get(task.meetingId) : null;
        return (
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
                  {task.notes ? <p className="mt-1 text-sm text-[#53635c]">{task.notes}</p> : null}
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
                <Tag>{task.energy}</Tag>
                <Tag>{task.context}</Tag>
                {task.owner ? <Tag>{task.owner}</Tag> : null}
                {task.due ? <Tag>Due {formatDate(task.due)}</Tag> : null}
                {task.status === "Waiting" ? <Tag tone="amber">Waiting</Tag> : null}
                {meeting ? <Tag>{meeting.title}</Tag> : null}
              </div>
            </div>
          </article>
        );
      })}
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
        const hasMoreNotes = topic.notes && (topic.notes.length > 420 || topic.notes.split(/\r?\n/).length > 4);
        return (
          <article key={topic.id} className="grid min-w-0 gap-3 rounded-lg border border-[#c5d9ee] bg-white p-4 [overflow-wrap:anywhere]">
            <div className="min-w-0">
              <h3 className="font-semibold leading-snug">{topic.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>{topic.project || "Inbox"}</Tag>
                <Tag tone="blue">Updated {formatDate((topic.updatedAt || topic.createdAt).slice(0, 10))}</Tag>
              </div>
              {topic.notes ? (
                <div className={isExpanded ? "note-preview mt-3" : "note-preview compact mt-3"}>
                  <NotePreview text={topic.notes} maxLines={isExpanded ? Infinity : 4} />
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
  notesRef,
  suggestions,
  suggestionMessage,
  isExtracting,
  onChange,
  onSave,
  onDelete,
  onExtract,
  onApplyNoteTool,
  onSuggestionChange,
  onAddSuggestions,
}: {
  draft: Meeting;
  projects: string[];
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  suggestions: TaskSuggestion[];
  suggestionMessage: string;
  isExtracting: boolean;
  onChange: (patch: Partial<Meeting>) => void;
  onSave: () => void;
  onDelete: () => void;
  onExtract: () => void;
  onApplyNoteTool: (tool: NoteTool) => void;
  onSuggestionChange: (index: number, patch: Partial<TaskSuggestion>) => void;
  onAddSuggestions: () => void;
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
        <LabeledInput label="Project" value={draft.project} onChange={(value) => onChange({ project: value })} list="project-options" />
        <LabeledInput label="Date" type="date" value={draft.date} onChange={(value) => onChange({ date: value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label="Start" type="time" value={draft.start} onChange={(value) => onChange({ start: value })} />
          <LabeledInput label="End" type="time" value={draft.end} onChange={(value) => onChange({ end: value })} />
        </div>
        <LabeledInput label="Location" value={draft.location} onChange={(value) => onChange({ location: value })} />
        <LabeledInput label="Attendees" value={draft.attendees} onChange={(value) => onChange({ attendees: value })} />
      </div>
      <datalist id="project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
        Notes
        <NoteToolbar onApply={onApplyNoteTool} />
        <textarea
          ref={notesRef}
          className="min-h-[13rem] rounded-md border border-[#cfd9d4] px-3 py-2 text-[#17201c] outline-none focus:border-[#0b6b5c]"
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
      {draft.notes.trim() ? (
        <div className="rounded-lg border border-[#d9e1dd] bg-[#fbfcfc] p-4">
          <p className="mb-2 text-xs font-bold uppercase text-[#53635c]">Preview</p>
          <div className="note-preview">
            <NotePreview text={draft.notes} />
          </div>
        </div>
      ) : null}
      {suggestionMessage ? (
        <SuggestionPanel
          meeting={draft}
          suggestions={suggestions}
          message={suggestionMessage}
          projects={projects}
          isExtracting={isExtracting}
          onChange={onSuggestionChange}
          onAdd={onAddSuggestions}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="danger-button w-full sm:w-auto" type="button" onClick={onDelete}>
          Delete
        </button>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button className="secondary-button" type="button" onClick={onExtract}>
            Extract tasks
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
  meetings,
  onChange,
  onSave,
  onDelete,
}: {
  draft: Task;
  projects: string[];
  meetings: Meeting[];
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
        <SelectField label="Energy" value={draft.energy} values={TASK_ENERGIES} onChange={(value) => onChange({ energy: value as TaskEnergy })} />
        <SelectField label="Context" value={draft.context} values={TASK_CONTEXTS} onChange={(value) => onChange({ context: value as TaskContext })} />
        <LabeledInput label="Owner" value={draft.owner} onChange={(value) => onChange({ owner: value })} />
        <LabeledInput label="Due" type="date" value={draft.due} onChange={(value) => onChange({ due: value })} />
        <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
          Meeting
          <select className="field" value={draft.meetingId} onChange={(event) => onChange({ meetingId: event.target.value })}>
            <option value="">No linked meeting</option>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {formatDate(meeting.date)} - {meeting.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <datalist id="task-project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
        Notes
        <textarea
          className="min-h-[7rem] rounded-md border border-[#cfd9d4] px-3 py-2 text-[#17201c] outline-none focus:border-[#0b6b5c]"
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
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
  notesRef,
  onChange,
  onSave,
  onDelete,
  onApplyNoteTool,
}: {
  draft: Topic;
  projects: string[];
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (patch: Partial<Topic>) => void;
  onSave: () => void;
  onDelete: () => void;
  onApplyNoteTool: (tool: NoteTool) => void;
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
        <LabeledInput label="Topic" value={draft.title} onChange={(value) => onChange({ title: value })} autoFocus />
        <LabeledInput label="Project" value={draft.project} onChange={(value) => onChange({ project: value })} list="topic-project-options" />
      </div>
      <datalist id="topic-project-options">
        {projects.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
      <label className="grid gap-2 text-sm font-semibold text-[#53635c]">
        Notes
        <NoteToolbar onApply={onApplyNoteTool} />
        <textarea
          ref={notesRef}
          className="min-h-[12rem] rounded-md border border-[#cfd9d4] px-3 py-2 text-[#17201c] outline-none focus:border-[#0b6b5c]"
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
      {draft.notes.trim() ? (
        <div className="rounded-lg border border-[#d9e1dd] bg-[#fbfcfc] p-4">
          <p className="mb-2 text-xs font-bold uppercase text-[#53635c]">Preview</p>
          <div className="note-preview">
            <NotePreview text={draft.notes} />
          </div>
        </div>
      ) : null}
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

function SuggestionPanel({
  meeting,
  suggestions,
  message,
  projects,
  isExtracting,
  onChange,
  onAdd,
}: {
  meeting: Meeting;
  suggestions: TaskSuggestion[];
  message: string;
  projects: string[];
  isExtracting: boolean;
  onChange: (index: number, patch: Partial<TaskSuggestion>) => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#bfd5cf] bg-[#f2faf7] p-3 sm:p-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h3 className="font-semibold">Task suggestions</h3>
          <p className="text-sm text-[#53635c]">From {meeting.title}</p>
        </div>
        <button className="primary-button w-full sm:w-auto" type="button" onClick={onAdd} disabled={!suggestions.some((suggestion) => suggestion.selected)}>
          Add selected
        </button>
      </div>
      {suggestions.length ? (
        <div className="mt-3 grid gap-2">
          {suggestions.map((suggestion, index) => (
            <div key={`suggestion-${index}`} className="grid gap-2 rounded-md border border-[#d9e1dd] bg-white p-3 sm:grid-cols-[auto_minmax(180px,1fr)_minmax(150px,220px)_5.5rem]">
              <input
                className="mt-2 h-5 w-5 accent-[#0b6b5c]"
                type="checkbox"
                checked={suggestion.selected}
                onChange={(event) => onChange(index, { selected: event.target.checked })}
                aria-label="Select task suggestion"
              />
              <input className="field" value={suggestion.title} onChange={(event) => onChange(index, { title: event.target.value })} />
              <select className="field" value={suggestion.project} onChange={(event) => onChange(index, { project: event.target.value })}>
                {[...new Set([...projects, suggestion.project, "Inbox"].filter(Boolean))].sort().map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
              <select className="field" value={suggestion.priority} onChange={(event) => onChange(index, { priority: event.target.value as TaskPriority })}>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-[#d9e1dd] bg-white p-3 text-sm font-semibold text-[#53635c]">
          {isExtracting ? "Extracting tasks..." : message}
        </p>
      )}
    </section>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 px-2 py-3 sm:px-4 sm:py-6">
      <section className="mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-lg border border-[#d9e1dd] bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#d9e1dd] p-4 sm:p-5">
          <h2 className="min-w-0 text-xl font-semibold [overflow-wrap:anywhere]">{title}</h2>
          <button className="ghost-button" type="button" onClick={onClose} aria-label="Close">
            Close
          </button>
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

function NoteToolbar({ onApply }: { onApply: (tool: NoteTool) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        ["bold", "Bold"],
        ["bullet", "Bullet"],
        ["task", "Task"],
        ["heading", "Heading"],
        ["divider", "Divider"],
      ].map(([tool, label]) => (
        <button key={tool} className="secondary-button" type="button" onClick={() => onApply(tool as NoteTool)}>
          {label}
        </button>
      ))}
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
      const task = line.match(taskLinePrefix());

      if (heading) {
        flushList();
        nodes.push({ type: "h", level: Math.min(heading[1].length + 3, 6), text: heading[2] });
        return;
      }

      if (bullet || task) {
        if (!currentList) currentList = [];
        currentList.push({ text: (bullet ? bullet[1] : task?.[1]) || "", task: Boolean(task) });
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
  return {
    id: cleanText(raw.id) || createId(),
    title: cleanText(raw.title),
    project: cleanText(raw.project) || "Inbox",
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
  return {
    id: createId(),
    title: "",
    project,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSuggestion(suggestion: Partial<TaskSuggestion>, meeting: Meeting): TaskSuggestion {
  const status = pickValue(suggestion.status, TASK_STATUSES, "Next");
  return {
    selected: suggestion.selected !== false,
    title: cleanText(suggestion.title),
    project: cleanText(suggestion.project) || meeting.project || "Inbox",
    status,
    priority: pickValue(suggestion.priority, TASK_PRIORITIES, "P2"),
    effort: pickValue(suggestion.effort, TASK_EFFORTS, "Quick"),
    energy: pickValue(suggestion.energy, TASK_ENERGIES, "Normal"),
    context: pickValue(suggestion.context, TASK_CONTEXTS, "Follow-up"),
    owner: cleanText(suggestion.owner) || (status === "Waiting" ? "" : "Jon"),
    due: cleanText(suggestion.due),
    meetingId: meeting.id,
    notes: cleanText(suggestion.notes) || `Source: ${formatDate(meeting.date)} ${meeting.title}`,
  };
}

function extractSuggestionsLocally(meeting: Meeting): TaskSuggestion[] {
  const actionWords =
    /\b(add|alert|ask|build|buy|call|check|clarify|confirm|create|decide|diagnose|discuss|get|give|go|investigate|make|order|pay|pick up|prepare|refresh|revise|schedule|send|submit|test|update|verify|write|waiting|risk|question|owe)\b/i;

  return meeting.notes
    .split(/\n+/)
    .map((line) => normalizeText(line.replace(/^[-*\u2022\u2610\t ]+/, "")))
    .filter(Boolean)
    .filter((line) => taskLinePrefix().test(line) || actionWords.test(line))
    .map((line) => {
      const title = normalizeText(line.replace(taskLinePrefix(), ""));
      const status = inferStatus(title);
      const effort = inferEffort(title);
      return {
        selected: true,
        title,
        project: inferProject(title, meeting.project),
        status,
        priority: inferPriority(title, status),
        effort,
        energy: effort === "Quick" ? "Low-focus" : "Normal",
        context: inferContext(title),
        owner: status === "Waiting" ? "" : "Jon",
        due: "",
        meetingId: meeting.id,
        notes: `Source: ${formatDate(meeting.date)} ${meeting.title}`,
      };
    });
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

function applyNoteToolToValue(value: string, selectionStart: number, selectionEnd: number, tool: NoteTool) {
  if (tool === "bold") return wrapSelectedText(value, selectionStart, selectionEnd, "**", "**", "bold text");
  if (tool === "bullet") return prefixSelectedLines(value, selectionStart, selectionEnd, "- ");
  if (tool === "task") return prefixSelectedLines(value, selectionStart, selectionEnd, "task - ");
  if (tool === "heading") return prefixSelectedLines(value, selectionStart, selectionEnd, "## ");
  return insertAtSelection(value, selectionStart, selectionEnd, "\n---\n");
}

function wrapSelectedText(value: string, start: number, end: number, before: string, after: string, placeholder: string) {
  const selected = value.slice(start, end) || placeholder;
  const replacement = `${before}${selected}${after}`;
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: start,
    selectionEnd: start + replacement.length,
  };
}

function prefixSelectedLines(value: string, start: number, end: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = end < value.length ? value.indexOf("\n", end) : value.length;
  const resolvedEnd = lineEnd === -1 ? value.length : lineEnd;
  const selected = value.slice(lineStart, resolvedEnd);
  const replacement = (selected || "")
    .split("\n")
    .map((line) => (line.trim() ? `${prefix}${line.replace(/^([-*]\s+|#{1,3}\s+|(?:task|todo|to do|action item|action|next step)\s*[:\-]\s*)/i, "")}` : line))
    .join("\n");
  const nextValue = `${value.slice(0, lineStart)}${replacement || prefix}${value.slice(resolvedEnd)}`;
  return {
    value: nextValue,
    selectionStart: lineStart,
    selectionEnd: lineStart + (replacement || prefix).length,
  };
}

function insertAtSelection(value: string, start: number, end: number, insert: string) {
  return {
    value: `${value.slice(0, start)}${insert}${value.slice(end)}`,
    selectionStart: start + insert.length,
    selectionEnd: start + insert.length,
  };
}

function groupTasksByProject(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const project = task.project || "Inbox";
    groups.set(project, [...(groups.get(project) || []), task]);
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function meetingMap(meetings: Meeting[]) {
  return new Map(meetings.map((meeting) => [meeting.id, meeting]));
}

function meetingDayToneMap(meetings: Meeting[]) {
  const dates = new Map<string, number>();
  meetings.forEach((meeting) => {
    if (!dates.has(meeting.date)) dates.set(meeting.date, dates.size % MEETING_DAY_TONES.length);
  });
  return dates;
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

function priorityBorder(priority: TaskPriority) {
  if (priority === "P1") return "border-[#f0b8b1]";
  if (priority === "P2") return "border-[#c5d9ee]";
  return "border-[#d9e1dd]";
}

function inferProject(line: string, fallback: string) {
  const lower = line.toLowerCase();
  const matches = [
    ["govdelivery", "Media / GovDelivery"],
    ["press release", "Media / GovDelivery"],
    ["tugboat", "Media / GovDelivery"],
    ["action agenda", "Action Agenda rollout"],
    ["fact sheet", "Action Agenda rollout"],
    ["caravan", "Caravan Lab - Salmon in Schools"],
    ["salmon", "Caravan Lab - Salmon in Schools"],
    ["riparian", "Riparian Roundtable products"],
    ["human wellbeing", "Human Wellbeing"],
    ["making waves", "Making Waves / website"],
    ["homepage", "Making Waves / website"],
    ["commitment", "Commitments Dashboard"],
    ["state of the sound", "State of the Sound"],
    ["position description", "HR"],
    ["katie", "HR"],
  ];
  const match = matches.find(([needle]) => lower.includes(needle));
  return match ? match[1] : fallback || "Inbox";
}

function inferStatus(line: string): TaskStatus {
  const lower = line.toLowerCase();
  if (lower.includes("waiting") || lower.includes("will come back") || lower.includes("will generate")) return "Waiting";
  if (lower.includes("today") || lower.includes("asap") || lower.includes("owe")) return "Today";
  return "Next";
}

function inferPriority(line: string, status: TaskStatus): TaskPriority {
  const lower = line.toLowerCase();
  if (status === "Today") return "P1";
  if (lower.includes("deadline") || lower.includes("risk") || lower.includes("broken") || lower.includes("approve")) return "P1";
  if (lower.includes("schedule") || lower.includes("clarify") || lower.includes("confirm")) return "P2";
  return "P3";
}

function inferEffort(line: string): TaskEffort {
  const lower = line.toLowerCase();
  if (lower.includes("write") || lower.includes("build") || lower.includes("design") || lower.includes("schedule detailing")) return "Medium";
  if (lower.includes("investigate") || lower.includes("refresh") || lower.includes("finish")) return "Medium";
  return "Quick";
}

function inferContext(line: string): TaskContext {
  const lower = line.toLowerCase();
  if (lower.includes("website") || lower.includes("web") || lower.includes("homepage") || lower.includes("elementor")) return "Website";
  if (lower.includes("design") || lower.includes("fact sheet") || lower.includes("video")) return "Design";
  if (lower.includes("send") || lower.includes("email") || lower.includes("govdelivery")) return "Email";
  if (lower.includes("schedule") || lower.includes("meeting")) return "Meeting";
  if (lower.includes("draft") || lower.includes("write") || lower.includes("press release")) return "Writing";
  return "Follow-up";
}

function taskLinePrefix() {
  return /^(?:task|todo|to do|action item|action|next step)\s*[:\-]\s*(.+)$/i;
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

function localDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value: string) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || createId();
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
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
