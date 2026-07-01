const storeKey = "meeting-task-dashboard-v1";
const googleDocImportVersion = "google-doc-june-18-2026-v1";
const verificationCleanupVersion = "verification-cleanup-june-21-2026-v1";

const seedTasks = [
  {
    title: "Give Ian the tugboat press-release text so he can prepare it in GovDelivery.",
    project: "Media / GovDelivery",
    status: "Today",
    priority: "P1",
    effort: "Quick",
    energy: "Normal",
    context: "Email",
    owner: "Jon",
    due: "2026-06-24",
    notes: "Source: June 18 Ian one-on-one"
  },
  {
    title: "Send the Action Agenda team a schedule for completing the web content and fact sheet.",
    project: "Action Agenda rollout",
    status: "Today",
    priority: "P1",
    effort: "Medium",
    energy: "Normal",
    context: "Writing",
    owner: "Jon",
    due: "",
    notes: "Schedule should refine final draft, design, translation, and print timing."
  },
  {
    title: "Schedule a meeting with Wess about commitment icons.",
    project: "Commitments Dashboard",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Low-focus",
    context: "Meeting",
    owner: "Jon",
    due: "",
    notes: "Source: ASAP list"
  },
  {
    title: "Clarify with Becky and Katie whether the new Human Wellbeing draft replaces all existing pages.",
    project: "Human Wellbeing",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    notes: "Needed before replacing existing web pages."
  },
  {
    title: "Confirm the exact July Riparian content deadline and build the design handoff schedule.",
    project: "Riparian Roundtable products",
    status: "Next",
    priority: "P1",
    effort: "Medium",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    notes: "Deadline was recorded as July 2X."
  },
  {
    title: "Caravan Lab revised video edit with improved pacing, music, and opening setup.",
    project: "Caravan Lab - Salmon in Schools",
    status: "Waiting",
    priority: "P2",
    effort: "Medium",
    energy: "Normal",
    context: "Design",
    owner: "Caravan Lab",
    due: "2026-06-30",
    notes: "Review after the revised edit arrives."
  }
];

const importedDocMeetings = [
  {
    id: "gdoc-meeting-2026-06-18-fiscal",
    title: "Fiscal Meeting",
    project: "Fiscal",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "Fiscal Team, Communications Team",
    notes: "Reviewed the variance. We spent decently but still have a big variance."
  },
  {
    id: "gdoc-meeting-2026-06-18-caravan-lab",
    title: "Caravan lab meeting",
    project: "Caravan Lab - Salmon in Schools",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "Jen Moslemi, Jon Bridgman, Katie Love, Chase Nuuhiwa, Ian McCabe",
    notes: "Noted the pacing was off and needs a better setup for why we are watching this video.\nSuggested moving the key line on importance, better music, and animations.\nCaravan will come back with a new edit by the end of the month with better pacing, music, and something at the beginning. Decide then what a contract extension would look like in terms of funds and timing."
  },
  {
    id: "gdoc-meeting-2026-06-18-nep-40th",
    title: "NEP 40th meeting",
    project: "NEP 40th anniversary",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "ANEP communications staff, Jon",
    notes: "EPA headquarters is working on a 40th anniversary campaign called Eat, Work, Play.\nNEP folks were not impressed.\nPolitically, we should support EPA staff as they sell the NEP program to upper management.\nEPA team is bringing the campaign to upper management on July 1.\nDiscussed survey results and Codex summary at www.psp.wa.gov/index-NEP.php.\nNEP Tech Transfer is in October. Check that funds were added to attend and alert leadership that there is a communications network meeting at the transfer."
  },
  {
    id: "gdoc-meeting-2026-06-18-commitments-dashboard",
    title: "Commitments Dashboard",
    project: "Commitments Dashboard",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "Don, Alex, Wess, Jen Burke, Robb, Ashley, Jon",
    notes: "Looked at how commitments are showing up in the Action Agenda Explorer.\nDiscussed a separate commitments dashboard.\nSuggested using the creative brief template to clarify the audience and need for the separate dashboard.\nDiscussed both an internal analysis tool and a public tool.\nOpen question: How should commitments show up in the State of the Sound?"
  },
  {
    id: "gdoc-meeting-2026-06-18-ian-one-on-one",
    title: "Ian One on One",
    project: "Media / GovDelivery",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "Ian, Jon",
    notes: "Give Ian the tugboat presser text to prepare in GovDelivery.\nDiscuss special issue website posting and social media support.\nDiscuss economic data report for website placement and social media support.\nAdd task to clean up the news boxes on the homepage with fresh content.\nSocial Science article intro will go on the Human Wellbeing pages and in a news box on the homepage.\nKatie is working on a new Human Wellbeing draft, but it is not clear whether it replaces existing pages. Need clarity from Becky.\nIan proposed a three-act structure for the Salmon in Schools video: fun and joy raising little salmon; poignant serious section about what salmon mean to kids; resolution of letting the salmon go."
  },
  {
    id: "gdoc-meeting-2026-06-18-action-agenda-one-pager",
    title: "Action Agenda 1 pager",
    project: "Action Agenda rollout",
    date: "2026-06-18",
    start: "",
    end: "",
    location: "",
    attendees: "Don, Robb, Doug, Katie, Chase, Ian, Jon",
    notes: "Don feels a simple one pager will work for him and Signe. If something more detailed is needed, use the executive summary.\nSigne will take the draft and write something that works for the Unconference by next Tuesday.\nAim to have a final draft by the end of the week.\nSend to Chase on June 29 so he can design a draft before vacation on July 2.\nFinal deadline needs to be set before the July 24 Unconference to allow Spanish translation and printing.\nTo do: send a final schedule detailing and refining these steps."
  },
  {
    id: "gdoc-meeting-2026-06-17-action-agenda-web-update",
    title: "Action Agenda Web Update",
    project: "Action Agenda rollout",
    date: "2026-06-17",
    start: "",
    end: "",
    location: "",
    attendees: "Doug, Robb, Jon, Katie, Chase",
    notes: "Sent links to the fact sheet, rollout plan, current web content, and press release.\nJon owes the team a schedule for getting the web content and fact sheet complete.\nAgreed it is better to start now.\nFinal deadline is whenever EPA approves.\nEmphasize the Explorer in the website and fact sheet.\nFall workshops are for insiders and do not need wide promotion.\nDiscussed getting a long list of quotes for the press release. Robb and Doug will generate a list of potential quotable people."
  },
  {
    id: "gdoc-meeting-2026-06-17-riparian-roundtable",
    title: "Riparian Roundtable",
    project: "Riparian Roundtable products",
    date: "2026-06-17",
    start: "",
    end: "",
    location: "",
    attendees: "Katie Love, Jen Grimm, Jon Bridgman",
    notes: "There will be two fact sheets that need designing and a report that needs a cover.\nJen will hand off the documents by the end of the month.\nContent deadline was recorded as July 2X. After that, hand off to Chase, who will have one week for design.\nJen is telling Larry there will be something for him to look at by the end of July."
  },
  {
    id: "gdoc-meeting-2026-06-17-state-of-the-sound-road-trip",
    title: "State of the Sound Road Trip",
    project: "State of the Sound",
    date: "2026-06-17",
    start: "",
    end: "",
    location: "",
    attendees: "Scott, Jon",
    notes: "Scott liked what was created last time.\nHe supported creating narratives around themes Mindy chooses for political reasons, while keeping State of the Sound as a fact-based comprehensive overview.\nSuggested not publishing the narratives in the actual State of the Sound so they do not get caught in the approval process. They could be used for presentations afterward.\nEarlier data deadline could reduce the summer crunch.\nScott asked whether the Science Panel letter would need to be submitted earlier. Jon suggested letters would still be written close to the end."
  },
  {
    id: "gdoc-meeting-2026-06-17-katie-one-on-one",
    title: "Katie One on One",
    project: "Media / GovDelivery",
    date: "2026-06-17",
    start: "",
    end: "",
    location: "",
    attendees: "Katie Love, Jon Bridgman",
    notes: "Fixed Katie's GovDelivery issue, but it highlighted concern that GovDelivery is not allowing signups.\nTalked about whether the GovDelivery press release list is current."
  }
];

const importedDocTasks = [
  {
    id: "gdoc-task-give-ian-tugboat-copy",
    title: "Give Ian the tugboat press-release text so he can prepare it in GovDelivery.",
    project: "Media / GovDelivery",
    status: "Next",
    priority: "P1",
    effort: "Quick",
    energy: "Normal",
    context: "Email",
    owner: "Jon",
    due: "2026-06-24",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Source: Ian One on One"
  },
  {
    id: "gdoc-task-send-tugboat-press-release",
    title: "Send the tugboat press release Wednesday, June 24.",
    project: "Media / GovDelivery",
    status: "Next",
    priority: "P1",
    effort: "Quick",
    energy: "Normal",
    context: "Email",
    owner: "Jon",
    due: "2026-06-24",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Source: collected Media list"
  },
  {
    id: "gdoc-task-action-agenda-production-schedule",
    title: "Send the Action Agenda team a schedule for completing the web content and fact sheet.",
    project: "Action Agenda rollout",
    status: "Next",
    priority: "P1",
    effort: "Medium",
    energy: "Normal",
    context: "Writing",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-17-action-agenda-web-update",
    notes: "Include web content, fact sheet, translation, printing, and Chase design timing."
  },
  {
    id: "gdoc-task-schedule-wess-icons",
    title: "Schedule a meeting with Wess about commitment icons.",
    project: "Commitments Dashboard",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Low-focus",
    context: "Meeting",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-commitments-dashboard",
    notes: "Source: ASAP list"
  },
  {
    id: "gdoc-task-send-caravan-three-act",
    title: "Send Caravan Lab Ian's proposed three-act structure for the Salmon in Schools video.",
    project: "Caravan Lab - Salmon in Schools",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Email",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Structure: joy raising salmon; meaning to kids; letting salmon go."
  },
  {
    id: "gdoc-task-clarify-human-wellbeing-replacement",
    title: "Clarify with Becky and Katie whether the new Human Wellbeing draft replaces all existing pages.",
    project: "Human Wellbeing",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Needed before replacing existing pages."
  },
  {
    id: "gdoc-task-finish-making-waves-translated",
    title: "Finish adding the translated Making Waves version to the Elementor pages.",
    project: "Making Waves / website",
    status: "Next",
    priority: "P2",
    effort: "Medium",
    energy: "Normal",
    context: "Website",
    owner: "Jon",
    due: "",
    meetingId: "",
    notes: "Source: collected Making Waves list"
  },
  {
    id: "gdoc-task-test-making-waves-embed",
    title: "Test the new Making Waves embed method and confirm whether it is blocked.",
    project: "Making Waves / website",
    status: "Next",
    priority: "P2",
    effort: "Medium",
    energy: "Normal",
    context: "Website",
    owner: "Jon",
    due: "",
    meetingId: "",
    notes: "Source: collected Making Waves list"
  },
  {
    id: "gdoc-task-investigate-govdelivery-signups",
    title: "Investigate whether GovDelivery signups are broken and whether the press list is current.",
    project: "Media / GovDelivery",
    status: "Next",
    priority: "P1",
    effort: "Medium",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-17-katie-one-on-one",
    notes: "Source: Katie One on One and Making Waves list"
  },
  {
    id: "gdoc-task-refresh-homepage-news-boxes",
    title: "Refresh the homepage news boxes, including the Social Science article introduction.",
    project: "Making Waves / website",
    status: "Next",
    priority: "P2",
    effort: "Medium",
    energy: "Normal",
    context: "Website",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Social Science intro goes on Human Wellbeing pages and homepage news box."
  },
  {
    id: "gdoc-task-check-nep-tech-transfer-funds",
    title: "Check that NEP Tech Transfer travel funds are included and alert leadership to the communications-network meeting.",
    project: "NEP 40th anniversary",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-nep-40th",
    notes: "NEP campaign will be rolled out at Tech Transfer."
  },
  {
    id: "gdoc-task-confirm-riparian-deadline",
    title: "Confirm the exact July Riparian content deadline and build the design handoff schedule.",
    project: "Riparian Roundtable products",
    status: "Next",
    priority: "P1",
    effort: "Medium",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    meetingId: "gdoc-meeting-2026-06-17-riparian-roundtable",
    notes: "Deadline was recorded only as July 2X."
  },
  {
    id: "gdoc-waiting-caravan-revised-edit",
    title: "Caravan Lab revised video edit with improved pacing, music, and opening setup.",
    project: "Caravan Lab - Salmon in Schools",
    status: "Waiting",
    priority: "P2",
    effort: "Medium",
    energy: "Normal",
    context: "Design",
    owner: "Caravan Lab",
    due: "2026-06-30",
    meetingId: "gdoc-meeting-2026-06-18-caravan-lab",
    notes: "Waiting item from dashboard."
  },
  {
    id: "gdoc-waiting-robb-doug-quotes",
    title: "Robb and Doug generate a list of potential people to quote for the Action Agenda press release.",
    project: "Action Agenda rollout",
    status: "Waiting",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Robb and Doug",
    due: "",
    meetingId: "gdoc-meeting-2026-06-17-action-agenda-web-update",
    notes: "Waiting item from Action Agenda Web Update."
  },
  {
    id: "gdoc-waiting-jen-riparian-content",
    title: "Jen Grimm sends two Riparian fact sheets and report content for design.",
    project: "Riparian Roundtable products",
    status: "Waiting",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Design",
    owner: "Jen Grimm",
    due: "2026-06-30",
    meetingId: "gdoc-meeting-2026-06-17-riparian-roundtable",
    notes: "Waiting item from dashboard."
  },
  {
    id: "gdoc-waiting-katie-human-wellbeing-draft",
    title: "Katie sends revised Human Wellbeing web-page draft.",
    project: "Human Wellbeing",
    status: "Waiting",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Website",
    owner: "Katie",
    due: "",
    meetingId: "gdoc-meeting-2026-06-18-ian-one-on-one",
    notes: "Waiting item from dashboard."
  },
  {
    id: "gdoc-waiting-epa-action-agenda-approval",
    title: "EPA approval for Action Agenda rollout.",
    project: "Action Agenda rollout",
    status: "Waiting",
    priority: "P1",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "EPA",
    due: "",
    meetingId: "gdoc-meeting-2026-06-17-action-agenda-web-update",
    notes: "Controls final rollout deadline."
  },
  {
    id: "gdoc-waiting-epa-nep-upper-management",
    title: "EPA NEP team upper-management review of the 40th-anniversary campaign.",
    project: "NEP 40th anniversary",
    status: "Waiting",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "EPA NEP team",
    due: "2026-07-01",
    meetingId: "gdoc-meeting-2026-06-18-nep-40th",
    notes: "Waiting item from dashboard."
  },
  {
    id: "gdoc-task-revise-jon-position-description",
    title: "Revise Jon's position description.",
    project: "HR",
    status: "Next",
    priority: "P3",
    effort: "Medium",
    energy: "Normal",
    context: "Admin",
    owner: "Jon",
    due: "",
    meetingId: "",
    notes: "Source: collected HR list"
  },
  {
    id: "gdoc-task-talk-chase-position-description",
    title: "Talk to Chase about his position description at the next one-on-one.",
    project: "HR",
    status: "Next",
    priority: "P3",
    effort: "Quick",
    energy: "Normal",
    context: "Meeting",
    owner: "Jon",
    due: "",
    meetingId: "",
    notes: "Source: collected HR list"
  },
  {
    id: "gdoc-task-katie-present",
    title: "Get Katie a present for the July lunch.",
    project: "HR",
    status: "Next",
    priority: "P3",
    effort: "Quick",
    energy: "Low-focus",
    context: "Admin",
    owner: "Jon",
    due: "",
    meetingId: "",
    notes: "Source: collected HR list"
  }
];

let state = { tasks: [], meetings: [], notes: [], topics: [], imports: [] };
let activeSection = "dashboard";
let activeView = "today";
let activeMeetingId = "";
let suggestions = [];
let suggestionEmptyText = "No suggestions yet.";
let serverSaveQueue = Promise.resolve();
const expandedMeetingNotes = new Set();
const expandedTopicNotes = new Set();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  agendaDate: $("#agendaDate"),
  todayMeetings: $("#todayMeetings"),
  todayTaskBoard: $("#todayTaskBoard"),
  todayTopics: $("#todayTopics"),
  meetingId: $("#meetingId"),
  meetingTitle: $("#meetingTitle"),
  meetingProject: $("#meetingProject"),
  meetingDate: $("#meetingDate"),
  meetingStart: $("#meetingStart"),
  meetingEnd: $("#meetingEnd"),
  meetingLocation: $("#meetingLocation"),
  meetingAttendees: $("#meetingAttendees"),
  meetingNotes: $("#meetingNotes"),
  meetingNotesPreview: $("#meetingNotesPreview"),
  capturePanel: $(".capture-panel"),
  captureTitle: $("#captureTitle"),
  meetingEditStatus: $("#meetingEditStatus"),
  icsImportStatus: $("#icsImportStatus"),
  saveMeetingButton: $("#saveMeetingButton"),
  saveMeetingButtonInline: $("#saveMeetingButtonInline"),
  processButton: $("#processButton"),
  clearMeetingButton: $("#clearMeetingButton"),
  deleteMeetingButton: $("#deleteMeetingButton"),
  meetingList: $("#meetingList"),
  suggestionList: $("#suggestionList"),
  addSuggestionButton: $("#addSuggestionButton"),
  addSuggestionsButton: $("#addSuggestionsButton"),
  newMeetingButton: $("#newMeetingButton"),
  newMeetingButtonMeetings: $("#newMeetingButtonMeetings"),
  newMeetingButtonList: $("#newMeetingButtonList"),
  newTopicButton: $("#newTopicButton"),
  newTaskButton: $("#newTaskButton"),
  newTaskButtonTasks: $("#newTaskButtonTasks"),
  taskBoard: $("#taskBoard"),
  taskSearch: $("#taskSearch"),
  projectFilter: $("#projectFilter"),
  summaryStrip: $("#summaryStrip"),
  projectOptions: $("#projectOptions"),
  taskDialog: $("#taskDialog"),
  taskForm: $("#taskForm"),
  dialogTitle: $("#dialogTitle"),
  meetingDialog: $("#meetingDialog"),
  meetingDialogForm: $("#meetingDialogForm"),
  meetingDialogTitle: $("#meetingDialogTitle"),
  dialogMeetingId: $("#dialogMeetingId"),
  dialogMeetingTitle: $("#dialogMeetingTitle"),
  dialogMeetingProject: $("#dialogMeetingProject"),
  dialogMeetingDate: $("#dialogMeetingDate"),
  dialogMeetingStart: $("#dialogMeetingStart"),
  dialogMeetingEnd: $("#dialogMeetingEnd"),
  dialogMeetingLocation: $("#dialogMeetingLocation"),
  dialogMeetingAttendees: $("#dialogMeetingAttendees"),
  dialogMeetingNotes: $("#dialogMeetingNotes"),
  dialogMeetingNotesPreview: $("#dialogMeetingNotesPreview"),
  deleteMeetingDialogButton: $("#deleteMeetingDialogButton"),
  cancelMeetingDialogButton: $("#cancelMeetingDialogButton"),
  closeMeetingDialogButton: $("#closeMeetingDialogButton"),
  taskId: $("#taskId"),
  taskTitle: $("#taskTitle"),
  taskProject: $("#taskProject"),
  taskStatus: $("#taskStatus"),
  taskPriority: $("#taskPriority"),
  taskEffort: $("#taskEffort"),
  taskEnergy: $("#taskEnergy"),
  taskContext: $("#taskContext"),
  taskOwner: $("#taskOwner"),
  taskDue: $("#taskDue"),
  taskNotes: $("#taskNotes"),
  deleteTaskButton: $("#deleteTaskButton"),
  cancelTaskButton: $("#cancelTaskButton"),
  closeDialogButton: $("#closeDialogButton"),
  topicDialog: $("#topicDialog"),
  topicForm: $("#topicForm"),
  topicDialogTitle: $("#topicDialogTitle"),
  topicId: $("#topicId"),
  topicTitle: $("#topicTitle"),
  topicProject: $("#topicProject"),
  topicNotes: $("#topicNotes"),
  topicNotesPreview: $("#topicNotesPreview"),
  deleteTopicButton: $("#deleteTopicButton"),
  cancelTopicButton: $("#cancelTopicButton"),
  closeTopicDialogButton: $("#closeTopicDialogButton"),
  exportButton: $("#exportButton"),
  importFile: $("#importFile"),
  icsFile: $("#icsFile"),
  icsFileList: $("#icsFileList")
};

async function loadState() {
  const remote = await loadServerState();
  const stored = localStorage.getItem(storeKey);
  const base = remote || (stored ? JSON.parse(stored) : {
    tasks: seedTasks.map((task) => ({ ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString() })),
    notes: [],
    topics: [],
    imports: []
  });

  const migratedMeetings = Array.isArray(base.meetings) ? base.meetings : [];
  const noteMeetings = (base.notes || []).map((note) => ({
    id: note.id || crypto.randomUUID(),
    title: note.title || "Untitled meeting",
    project: note.project || "",
    date: note.date || todayIso(),
    start: note.start || "",
    end: note.end || "",
    location: note.location || "",
    attendees: note.attendees || "",
    notes: note.content || note.notes || "",
    createdAt: note.createdAt || new Date().toISOString()
  }));

  const nextState = {
    tasks: base.tasks || [],
    meetings: [...migratedMeetings, ...noteMeetings],
    notes: [],
    topics: Array.isArray(base.topics) ? base.topics : [],
    imports: Array.isArray(base.imports) ? base.imports : []
  };

  cleanupVerificationData(nextState);
  applyGoogleDocImport(nextState);
  return nextState;
}

function saveState({ reportErrors = false } = {}) {
  localStorage.setItem(storeKey, JSON.stringify(state));
  const save = saveServerState(state);
  if (!reportErrors) save.catch(() => {});
  return save;
}

async function loadServerState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function saveServerState(nextState) {
  const snapshot = JSON.stringify(nextState);
  serverSaveQueue = serverSaveQueue
    .catch(() => {})
    .then(async () => {
      if (!location.protocol.startsWith("http")) return { saved: false, offline: true };
      const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: snapshot
        });
      if (!response.ok) throw new Error("Unable to save to the local database.");
      return { saved: true };
    });
  return serverSaveQueue;
}

function applyGoogleDocImport(nextState) {
  if (nextState.imports.includes(googleDocImportVersion)) return;

  const importedAt = new Date().toISOString();
  const meetingsById = new Map(nextState.meetings.map((meeting) => [meeting.id, meeting]));
  importedDocMeetings.forEach((meeting) => {
    meetingsById.set(meeting.id, {
      ...meeting,
      createdAt: meetingsById.get(meeting.id)?.createdAt || importedAt
    });
  });

  const importedTitles = new Set(importedDocTasks.map((task) => normalizeText(task.title).toLowerCase()));
  const existingWithoutSeedDuplicates = nextState.tasks.filter((task) => !importedTitles.has(normalizeText(task.title).toLowerCase()));
  const tasksById = new Map(existingWithoutSeedDuplicates.map((task) => [task.id, task]));
  importedDocTasks.forEach((task) => {
    tasksById.set(task.id, {
      ...task,
      createdAt: tasksById.get(task.id)?.createdAt || importedAt
    });
  });

  nextState.meetings = [...meetingsById.values()];
  nextState.tasks = [...tasksById.values()];
  nextState.imports = [...nextState.imports, googleDocImportVersion];
}

function cleanupVerificationData(nextState) {
  if (nextState.imports.includes(verificationCleanupVersion)) return;

  nextState.meetings = nextState.meetings.filter((meeting) => {
    return meeting.project !== "Test Project" && meeting.title !== "Morning planning test";
  });
  nextState.tasks = nextState.tasks.filter((task) => {
    const text = `${task.title} ${task.project} ${task.notes}`.toLowerCase();
    return !text.includes("test project") && !text.includes("test meeting");
  });
  nextState.topics = (nextState.topics || []).filter((topic) => {
    const text = `${topic.title} ${topic.project} ${topic.notes}`.toLowerCase();
    return !text.includes("test project") && !text.includes("test meeting");
  });
  nextState.imports = [...nextState.imports, verificationCleanupVersion];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function meetingDateTime(meeting) {
  return `${meeting.date || "9999-12-31"}T${meeting.start || "23:59"}`;
}

function inferProject(line, fallback) {
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
    ["katie", "HR"]
  ];
  const match = matches.find(([needle]) => lower.includes(needle));
  return match ? match[1] : fallback || "Inbox";
}

function inferStatus(line) {
  const lower = line.toLowerCase();
  if (lower.includes("waiting") || lower.includes("will come back") || lower.includes("will generate")) return "Waiting";
  if (lower.includes("today") || lower.includes("asap") || lower.includes("owe")) return "Today";
  return "Next";
}

function inferPriority(line, status) {
  const lower = line.toLowerCase();
  if (status === "Today") return "P1";
  if (lower.includes("deadline") || lower.includes("risk") || lower.includes("broken") || lower.includes("approve")) return "P1";
  if (lower.includes("schedule") || lower.includes("clarify") || lower.includes("confirm")) return "P2";
  return "P3";
}

function inferEffort(line) {
  const lower = line.toLowerCase();
  if (lower.includes("write") || lower.includes("build") || lower.includes("design") || lower.includes("schedule detailing")) return "Medium";
  if (lower.includes("investigate") || lower.includes("refresh") || lower.includes("finish")) return "Medium";
  return "Quick";
}

function inferContext(line) {
  const lower = line.toLowerCase();
  if (lower.includes("website") || lower.includes("web") || lower.includes("homepage") || lower.includes("elementor")) return "Website";
  if (lower.includes("design") || lower.includes("fact sheet") || lower.includes("video")) return "Design";
  if (lower.includes("send") || lower.includes("email") || lower.includes("govdelivery")) return "Email";
  if (lower.includes("schedule") || lower.includes("meeting")) return "Meeting";
  if (lower.includes("draft") || lower.includes("write") || lower.includes("press release")) return "Writing";
  return "Follow-up";
}

function meetingFromForm() {
  return {
    id: elements.meetingId.value || crypto.randomUUID(),
    title: elements.meetingTitle.value.trim() || "Untitled meeting",
    project: elements.meetingProject.value.trim(),
    date: elements.meetingDate.value || todayIso(),
    start: elements.meetingStart.value,
    end: elements.meetingEnd.value,
    location: elements.meetingLocation.value.trim(),
    attendees: elements.meetingAttendees.value.trim(),
    notes: elements.meetingNotes.value.trim(),
    createdAt: state.meetings.find((meeting) => meeting.id === elements.meetingId.value)?.createdAt || new Date().toISOString()
  };
}

function meetingFromDialog() {
  const id = elements.dialogMeetingId.value;
  return {
    id,
    title: elements.dialogMeetingTitle.value.trim() || "Untitled meeting",
    project: elements.dialogMeetingProject.value.trim(),
    date: elements.dialogMeetingDate.value || todayIso(),
    start: elements.dialogMeetingStart.value,
    end: elements.dialogMeetingEnd.value,
    location: elements.dialogMeetingLocation.value.trim(),
    attendees: elements.dialogMeetingAttendees.value.trim(),
    notes: elements.dialogMeetingNotes.value.trim(),
    createdAt: state.meetings.find((meeting) => meeting.id === id)?.createdAt || new Date().toISOString()
  };
}

function saveMeeting({ render = true } = {}) {
  const meeting = meetingFromForm();
  state.meetings = state.meetings.some((item) => item.id === meeting.id)
    ? state.meetings.map((item) => item.id === meeting.id ? meeting : item)
    : [...state.meetings, meeting];
  activeMeetingId = meeting.id;
  elements.meetingId.value = meeting.id;
  elements.deleteMeetingButton.hidden = false;
  setMeetingFormMode(meeting);
  saveState();
  if (render) renderAll();
  return meeting;
}

function saveMeetingDialog() {
  const meeting = meetingFromDialog();
  state.meetings = state.meetings.some((item) => item.id === meeting.id)
    ? state.meetings.map((item) => item.id === meeting.id ? meeting : item)
    : [...state.meetings, meeting];
  activeMeetingId = meeting.id;
  saveState();
  elements.meetingDialog.close();
  renderAll();
  return meeting;
}

function setMeetingFormMode(meeting = null) {
  const isEditing = Boolean(meeting);
  elements.capturePanel.classList.toggle("editing", isEditing);
  elements.captureTitle.textContent = isEditing ? "Editing Meeting" : "Add Meeting";
  elements.saveMeetingButton.textContent = isEditing ? "Save Changes" : "Save Meeting";
  elements.saveMeetingButtonInline.textContent = isEditing ? "Save Changes" : "Save Meeting";
  elements.meetingEditStatus.hidden = !isEditing;
  elements.meetingEditStatus.textContent = isEditing ? `Loaded: ${meeting.title}` : "";
}

function clearMeetingForm() {
  activeMeetingId = "";
  elements.meetingId.value = "";
  elements.meetingTitle.value = "";
  elements.meetingProject.value = "";
  elements.meetingDate.value = elements.agendaDate.value || todayIso();
  elements.meetingStart.value = "";
  elements.meetingEnd.value = "";
  elements.meetingLocation.value = "";
  elements.meetingAttendees.value = "";
  elements.meetingNotes.value = "";
  elements.deleteMeetingButton.hidden = true;
  setMeetingFormMode();
  suggestions = [];
  suggestionEmptyText = "No suggestions yet.";
  updateMeetingFormPreview();
  renderSuggestions();
}

function editMeeting(id) {
  const meeting = state.meetings.find((item) => item.id === id);
  if (!meeting) return;
  activeMeetingId = meeting.id;
  elements.meetingId.value = meeting.id;
  elements.meetingTitle.value = meeting.title;
  elements.meetingProject.value = meeting.project || "";
  elements.meetingDate.value = meeting.date || todayIso();
  elements.meetingStart.value = meeting.start || "";
  elements.meetingEnd.value = meeting.end || "";
  elements.meetingLocation.value = meeting.location || "";
  elements.meetingAttendees.value = meeting.attendees || "";
  elements.meetingNotes.value = meeting.notes || "";
  elements.deleteMeetingButton.hidden = false;
  setMeetingFormMode(meeting);
  suggestions = [];
  suggestionEmptyText = "No suggestions yet.";
  switchSection("meetings");
  updateMeetingFormPreview();
  renderSuggestions();
  elements.capturePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.meetingTitle.focus({ preventScroll: true });
}

function openMeetingDialog(id) {
  const meeting = state.meetings.find((item) => item.id === id);
  if (!meeting) return;
  activeMeetingId = meeting.id;
  elements.meetingDialogTitle.textContent = meeting.title || "Edit Meeting";
  elements.dialogMeetingId.value = meeting.id;
  elements.dialogMeetingTitle.value = meeting.title || "";
  elements.dialogMeetingProject.value = meeting.project || "";
  elements.dialogMeetingDate.value = meeting.date || todayIso();
  elements.dialogMeetingStart.value = meeting.start || "";
  elements.dialogMeetingEnd.value = meeting.end || "";
  elements.dialogMeetingLocation.value = meeting.location || "";
  elements.dialogMeetingAttendees.value = meeting.attendees || "";
  elements.dialogMeetingNotes.value = meeting.notes || "";
  updateMeetingDialogPreview();
  elements.meetingDialog.showModal();
  elements.dialogMeetingTitle.focus();
}

function deleteMeeting() {
  const id = elements.meetingId.value;
  if (!id) return;
  deleteMeetingById(id, { clearForm: true });
}

function deleteMeetingById(id, { clearForm = false, closeDialog = false } = {}) {
  const meeting = state.meetings.find((item) => item.id === id);
  if (!meeting) return;
  if (!confirm(`Delete "${meeting.title || "this meeting"}"? Linked tasks will stay, but their meeting link will be cleared.`)) return;

  state.meetings = state.meetings.filter((item) => item.id !== id);
  state.tasks = state.tasks.map((task) => task.meetingId === id ? { ...task, meetingId: "" } : task);
  saveState();
  if (clearForm || elements.meetingId.value === id) clearMeetingForm();
  if (closeDialog) elements.meetingDialog.close();
  renderAll();
}

async function extractSuggestions() {
  const meeting = saveMeeting({ render: false });
  suggestions = [];
  suggestionEmptyText = "Extracting tasks...";
  renderSuggestions();

  try {
    const aiSuggestions = await extractSuggestionsWithAi(meeting);
    suggestions = aiSuggestions.map((suggestion) => normalizeSuggestion(suggestion, meeting));
    suggestionEmptyText = "AI found no tasks in these notes.";
  } catch {
    suggestions = extractSuggestionsLocally(meeting);
    suggestionEmptyText = "AI extraction is unavailable, and the fallback found no task-like lines.";
  }

  renderAll();
}

async function extractSuggestionsWithAi(meeting) {
  const response = await fetch("/api/extract-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting, projects: getProjects() })
  });
  if (!response.ok) throw new Error("AI extraction unavailable.");
  const result = await response.json();
  if (!Array.isArray(result.tasks)) return [];
  return result.tasks;
}

function extractSuggestionsLocally(meeting) {
  const lines = meeting.notes
    .split(/\n+/)
    .map((line) => normalizeText(line.replace(/^[-*•☐\t ]+/, "")))
    .filter(Boolean);

  const actionWords = /\b(add|alert|ask|build|buy|call|check|clarify|confirm|create|decide|diagnose|discuss|get|give|go|investigate|make|order|pay|pick up|prepare|refresh|revise|schedule|send|submit|test|update|verify|write|waiting|risk|question|owe)\b/i;
  return lines
    .filter((line) => isTaskLikeLine(line, actionWords))
    .map((line) => {
      const title = taskTitleFromLine(line);
      const project = inferProject(title, meeting.project);
      const status = inferStatus(title);
      const effort = inferEffort(title);
      return {
        selected: true,
        title,
        project,
        status,
        priority: inferPriority(title, status),
        effort,
        energy: effort === "Quick" ? "Low-focus" : "Normal",
        context: inferContext(title),
        owner: status === "Waiting" ? "" : "Jon",
        due: "",
        meetingId: meeting.id,
        notes: `Source: ${formatDate(meeting.date)} ${meeting.title}`
      };
    });
}

function normalizeSuggestion(suggestion, meeting) {
  const title = normalizeText(suggestion.title || "");
  return {
    selected: suggestion.selected !== false,
    title,
    project: suggestion.project || meeting.project || "Inbox",
    status: suggestion.status || "Next",
    priority: suggestion.priority || "P2",
    effort: suggestion.effort || "Quick",
    energy: suggestion.energy || "Normal",
    context: suggestion.context || "Follow-up",
    owner: suggestion.owner || (suggestion.status === "Waiting" ? "" : "Jon"),
    due: suggestion.due || "",
    meetingId: meeting.id,
    notes: suggestion.notes || `Source: ${formatDate(meeting.date)} ${meeting.title}`
  };
}

function isTaskLikeLine(line, actionWords) {
  return taskLinePrefix().test(line) || actionWords.test(line);
}

function taskTitleFromLine(line) {
  return normalizeText(line.replace(taskLinePrefix(), ""));
}

function taskLinePrefix() {
  return /^(task|todo|to do|action item|action|next step)\s*[:\-]\s*/i;
}

function renderSuggestions() {
  elements.suggestionList.innerHTML = "";
  elements.suggestionList.classList.toggle("empty", suggestions.length === 0);
  elements.addSuggestionsButton.disabled = suggestions.length === 0;

  if (!suggestions.length) {
    elements.suggestionList.innerHTML = `<p>${escapeHtml(suggestionEmptyText)}</p>`;
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const row = document.createElement("div");
    row.className = "suggestion-row";
    row.innerHTML = `
      <input type="checkbox" ${suggestion.selected ? "checked" : ""} data-suggestion-check="${index}" aria-label="Select suggestion">
      <input type="text" value="${escapeAttr(suggestion.title)}" data-suggestion-title="${index}">
      <select data-suggestion-project="${index}">
        ${projectOptionsHtml(suggestion.project)}
      </select>
      <select data-suggestion-priority="${index}">
        ${["P1", "P2", "P3"].map((value) => optionHtml(value, suggestion.priority)).join("")}
      </select>
    `;
    elements.suggestionList.appendChild(row);
  });
}

function syncSuggestionEdits() {
  suggestions.forEach((suggestion, index) => {
    const checked = $(`[data-suggestion-check="${index}"]`);
    const title = $(`[data-suggestion-title="${index}"]`);
    const project = $(`[data-suggestion-project="${index}"]`);
    const priority = $(`[data-suggestion-priority="${index}"]`);
    suggestion.selected = checked.checked;
    suggestion.title = title.value.trim();
    suggestion.project = project.value;
    suggestion.priority = priority.value;
  });
}

function addSelectedSuggestions() {
  syncSuggestionEdits();
  const now = new Date().toISOString();
  const newTasks = suggestions
    .filter((suggestion) => suggestion.selected && suggestion.title)
    .map(({ selected, ...suggestion }) => ({ ...suggestion, id: crypto.randomUUID(), createdAt: now }));

  state.tasks = [...newTasks, ...state.tasks];
  suggestions = [];
  suggestionEmptyText = "No suggestions yet.";
  saveState();
  renderAll();
}

function getProjects() {
  return [...new Set([
    ...state.tasks.map((task) => task.project),
    ...state.meetings.map((meeting) => meeting.project),
    ...(state.topics || []).map((topic) => topic.project)
  ].filter(Boolean))].sort();
}

function projectOptionsHtml(selected) {
  const projects = [...new Set([...getProjects(), selected, "Inbox"])].filter(Boolean).sort();
  return projects.map((project) => optionHtml(project, selected)).join("");
}

function optionHtml(value, selected) {
  return `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function renderProjectControls() {
  const projects = getProjects();
  const current = elements.projectFilter.value;
  elements.projectFilter.innerHTML = `<option value="">All projects</option>${projects.map((project) => optionHtml(project, current)).join("")}`;
  elements.projectOptions.innerHTML = projects.map((project) => `<option value="${escapeAttr(project)}"></option>`).join("");
}

function renderSummary() {
  const active = state.tasks.filter((task) => task.status !== "Done");
  const selectedDate = elements.agendaDate.value || todayIso();
  const summary = [
    ["Meetings", state.meetings.filter((meeting) => meeting.date === selectedDate).length],
    ["Topics", (state.topics || []).length],
    ["Today", state.tasks.filter((task) => task.status === "Today").length],
    ["P1", active.filter((task) => task.priority === "P1").length],
    ["Quick", active.filter((task) => task.effort === "Quick").length],
    ["Waiting", state.tasks.filter((task) => task.status === "Waiting").length]
  ];
  elements.summaryStrip.innerHTML = summary.map(([label, count]) => `<div class="summary-item"><strong>${count}</strong><span>${label}</span></div>`).join("");
}

function meetingsForDate(date) {
  return state.meetings
    .filter((meeting) => meeting.date === date)
    .sort((a, b) => meetingDateTime(a).localeCompare(meetingDateTime(b)));
}

function allMeetings() {
  return state.meetings
    .sort((a, b) => meetingDateTime(b).localeCompare(meetingDateTime(a)));
}

function renderDashboardMeetings() {
  const date = elements.agendaDate.value || todayIso();
  const meetings = meetingsForDate(date);
  renderMeetingCollection(elements.todayMeetings, meetings, "No meetings on this date.");
}

function renderMeetingList() {
  const meetings = allMeetings();
  renderMeetingCollection(elements.meetingList, meetings, "No meetings yet.");
}

function renderMeetingCollection(container, meetings, emptyText) {
  container.innerHTML = "";
  if (!meetings.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  meetings.forEach((meeting) => container.appendChild(meetingCard(meeting)));
}

function meetingCard(meeting) {
  const card = document.createElement("article");
  card.className = "meeting-card";
  const notesExpanded = expandedMeetingNotes.has(meeting.id);
  const hasMoreNotes = meeting.notes && (meeting.notes.split(/\r?\n/).length > 4 || meeting.notes.length > 420);
  const time = meeting.start ? `${formatTime(meeting.start)}${meeting.end ? `-${formatTime(meeting.end)}` : ""}` : "Any time";
  const details = [
    meeting.project,
    meeting.location,
    meeting.attendees ? `With ${meeting.attendees}` : ""
  ].filter(Boolean).join(" · ");
  card.innerHTML = `
    <div class="meeting-time">${escapeHtml(time)}<br><span>${escapeHtml(formatDate(meeting.date))}</span></div>
    <div class="meeting-main">
      <h3>${escapeHtml(meeting.title)}</h3>
      ${details ? `<p>${escapeHtml(details)}</p>` : ""}
      ${meeting.notes ? `<div class="note-preview ${notesExpanded ? "" : "compact"}">${renderNotePreview(meeting.notes, { maxLines: notesExpanded ? Infinity : 4 })}</div>` : ""}
      ${hasMoreNotes ? `<button class="note-expand-button" type="button" data-toggle-notes="${meeting.id}">${notesExpanded ? "Less notes" : "More notes"}</button>` : ""}
    </div>
    <div class="meeting-actions">
      <button type="button" data-edit-meeting="${meeting.id}">Edit</button>
      <button type="button" data-process-meeting="${meeting.id}">Extract</button>
      <button class="delete-meeting-action" type="button" data-delete-meeting="${meeting.id}">Delete</button>
    </div>
  `;
  return card;
}

function allTopics() {
  return [...(state.topics || [])].sort((a, b) => {
    return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
  });
}

function renderDashboardTopics() {
  renderTopicCollection(elements.todayTopics, allTopics(), "No topics yet.");
}

function renderTopicCollection(container, topics, emptyText) {
  container.innerHTML = "";
  if (!topics.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  topics.forEach((topic) => container.appendChild(topicCard(topic)));
}

function topicCard(topic) {
  const card = document.createElement("article");
  card.className = "topic-card";
  const notesExpanded = expandedTopicNotes.has(topic.id);
  const hasMoreNotes = topic.notes && (topic.notes.split(/\r?\n/).length > 4 || topic.notes.length > 420);
  const updated = topic.updatedAt || topic.createdAt;
  card.innerHTML = `
    <div class="topic-main">
      <h3>${escapeHtml(topic.title || "Untitled topic")}</h3>
      <div class="task-tags">
        <span class="tag">${escapeHtml(topic.project || "Inbox")}</span>
        ${updated ? `<span class="tag">Updated ${escapeHtml(formatDate(updated.slice(0, 10)))}</span>` : ""}
      </div>
      ${topic.notes ? `<div class="note-preview ${notesExpanded ? "" : "compact"}">${renderNotePreview(topic.notes, { maxLines: notesExpanded ? Infinity : 4 })}</div>` : ""}
      ${hasMoreNotes ? `<button class="note-expand-button" type="button" data-toggle-topic-notes="${topic.id}">${notesExpanded ? "Less notes" : "More notes"}</button>` : ""}
    </div>
    <div class="topic-actions">
      <button type="button" data-edit-topic="${topic.id}">Edit</button>
      <button type="button" data-topic-task="${topic.id}">Make Task</button>
      <button class="delete-topic-action" type="button" data-delete-topic="${topic.id}">Delete</button>
    </div>
  `;
  return card;
}

function filteredTasks(view = activeView) {
  const search = elements.taskSearch.value.trim().toLowerCase();
  const project = elements.projectFilter.value;
  return state.tasks.filter((task) => {
    const matchesSearch = !search || [task.title, task.project, task.notes, task.owner].join(" ").toLowerCase().includes(search);
    const matchesProject = !project || task.project === project;
    if (!matchesSearch || !matchesProject) return false;
    if (view === "today") return task.status === "Today";
    if (view === "next") return ["Inbox", "Next", "Scheduled"].includes(task.status);
    if (view === "waiting") return task.status === "Waiting";
    if (view === "done") return task.status === "Done";
    return task.status !== "Done";
  });
}

function dashboardTasksForDate(date) {
  return state.tasks
    .filter((task) => {
      if (task.status === "Today") return true;
      return task.status === "Done" && task.completedAt && task.completedAt.slice(0, 10) === date;
    })
    .sort((a, b) => {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (a.status !== "Done" && b.status === "Done") return -1;
      return (b.completedAt || b.createdAt || "").localeCompare(a.completedAt || a.createdAt || "");
    });
}

function renderDashboardTasks() {
  const date = elements.agendaDate.value || todayIso();
  renderTaskCollection(elements.todayTaskBoard, dashboardTasksForDate(date), "No Today tasks yet.");
}

function renderTasks() {
  const tasks = filteredTasks();
  elements.taskBoard.innerHTML = "";

  if (activeView === "projects") {
    if (!tasks.length) {
      elements.taskBoard.innerHTML = `<div class="empty-state">Nothing in this view.</div>`;
      return;
    }
    const byProject = tasks.reduce((groups, task) => {
      const project = task.project || "Inbox";
      if (!groups.has(project)) groups.set(project, []);
      groups.get(project).push(task);
      return groups;
    }, new Map());
    [...byProject.entries()].sort().forEach(([project, projectTasks]) => {
      const group = document.createElement("section");
      group.className = "project-group";
      group.innerHTML = `<h3 class="project-title">${escapeHtml(project)}</h3>`;
      projectTasks.forEach((task) => group.appendChild(taskCard(task)));
      elements.taskBoard.appendChild(group);
    });
    return;
  }

  renderTaskCollection(elements.taskBoard, tasks, "Nothing in this view.");
}

function renderTaskCollection(container, tasks, emptyText) {
  container.innerHTML = "";
  if (!tasks.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  tasks.forEach((task) => container.appendChild(taskCard(task)));
}

function taskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card ${task.priority.toLowerCase()} ${task.status === "Done" ? "done" : ""}`;
  const due = task.due ? `<span class="tag">Due ${formatDate(task.due)}</span>` : "";
  const waiting = task.status === "Waiting" ? `<span class="tag waiting">Waiting</span>` : "";
  const meeting = task.meetingId ? state.meetings.find((item) => item.id === task.meetingId) : null;
  card.innerHTML = `
    <input type="checkbox" ${task.status === "Done" ? "checked" : ""} data-done="${task.id}" aria-label="Mark task done">
    <div class="task-main">
      <h3>${escapeHtml(task.title)}</h3>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ""}
      <div class="task-tags">
        <span class="tag">${escapeHtml(task.project || "Inbox")}</span>
        <span class="tag ${task.priority.toLowerCase()}">${task.priority}</span>
        <span class="tag">${task.effort}</span>
        <span class="tag">${task.energy}</span>
        <span class="tag">${task.context}</span>
        ${task.owner ? `<span class="tag">${escapeHtml(task.owner)}</span>` : ""}
        ${meeting ? `<span class="tag">${escapeHtml(meeting.title)}</span>` : ""}
        ${due}
        ${waiting}
      </div>
    </div>
    <div class="task-actions">
      <button type="button" data-edit="${task.id}">Edit</button>
      ${task.status !== "Today" && task.status !== "Done" ? `<button type="button" data-today="${task.id}">Today</button>` : ""}
      ${task.status !== "Waiting" && task.status !== "Done" ? `<button type="button" data-waiting="${task.id}">Wait</button>` : ""}
    </div>
  `;
  return card;
}

function openTaskDialog(task = null, { forceNew = false } = {}) {
  const isNew = forceNew || !task;
  const data = task || {
    id: "",
    title: "",
    project: elements.meetingProject.value.trim() || "Inbox",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    notes: "",
    meetingId: activeMeetingId
  };

  elements.dialogTitle.textContent = isNew ? "New Task" : "Edit Task";
  elements.taskId.value = data.id;
  elements.taskTitle.value = data.title;
  elements.taskProject.value = data.project;
  elements.taskStatus.value = data.status;
  elements.taskPriority.value = data.priority;
  elements.taskEffort.value = data.effort;
  elements.taskEnergy.value = data.energy;
  elements.taskContext.value = data.context;
  elements.taskOwner.value = data.owner || "";
  elements.taskDue.value = data.due || "";
  elements.taskNotes.value = data.notes || "";
  elements.deleteTaskButton.hidden = isNew;
  elements.taskDialog.showModal();
}

function saveTaskFromDialog() {
  const id = elements.taskId.value || crypto.randomUUID();
  const existing = state.tasks.find((item) => item.id === id);
  const task = {
    id,
    title: elements.taskTitle.value.trim(),
    project: elements.taskProject.value.trim() || "Inbox",
    status: elements.taskStatus.value,
    priority: elements.taskPriority.value,
    effort: elements.taskEffort.value,
    energy: elements.taskEnergy.value,
    context: elements.taskContext.value,
    owner: elements.taskOwner.value.trim(),
    due: elements.taskDue.value,
    notes: elements.taskNotes.value.trim(),
    meetingId: existing?.meetingId || activeMeetingId || "",
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  state.tasks = existing
    ? state.tasks.map((item) => item.id === id ? task : item)
    : [task, ...state.tasks];
  saveState();
  elements.taskDialog.close();
  renderAll();
}

function updateTask(id, patch) {
  state.tasks = state.tasks.map((task) => task.id === id ? { ...task, ...patch } : task);
  saveState();
  renderAll();
}

function deleteTask() {
  const id = elements.taskId.value;
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  elements.taskDialog.close();
  renderAll();
}

function openTopicDialog(topic = null) {
  const isNew = !topic;
  const data = topic || {
    id: "",
    title: "",
    project: elements.meetingProject.value.trim() || "Inbox",
    notes: ""
  };

  elements.topicDialogTitle.textContent = isNew ? "New Topic" : "Edit Topic";
  elements.topicId.value = data.id;
  elements.topicTitle.value = data.title || "";
  elements.topicProject.value = data.project || "Inbox";
  elements.topicNotes.value = data.notes || "";
  elements.deleteTopicButton.hidden = isNew;
  updateTopicDialogPreview();
  elements.topicDialog.showModal();
  elements.topicTitle.focus();
}

function saveTopicFromDialog() {
  const id = elements.topicId.value || crypto.randomUUID();
  const existing = (state.topics || []).find((item) => item.id === id);
  const now = new Date().toISOString();
  const topic = {
    id,
    title: elements.topicTitle.value.trim(),
    project: elements.topicProject.value.trim() || "Inbox",
    notes: elements.topicNotes.value.trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  state.topics = existing
    ? state.topics.map((item) => item.id === id ? topic : item)
    : [topic, ...(state.topics || [])];
  saveState();
  elements.topicDialog.close();
  renderAll();
}

function deleteTopic() {
  const id = elements.topicId.value;
  const topic = (state.topics || []).find((item) => item.id === id);
  if (!topic) return;
  if (!confirm(`Delete "${topic.title || "this topic"}"?`)) return;
  state.topics = state.topics.filter((item) => item.id !== id);
  expandedTopicNotes.delete(id);
  saveState();
  elements.topicDialog.close();
  renderAll();
}

function makeTaskFromTopic(id) {
  const topic = (state.topics || []).find((item) => item.id === id);
  if (!topic) return;
  openTaskDialog({
    id: "",
    title: topic.title || "",
    project: topic.project || "Inbox",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    notes: topic.notes || "",
    meetingId: ""
  }, { forceNew: true });
}

function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meeting-task-dashboard-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    state = JSON.parse(reader.result);
    if (!Array.isArray(state.meetings)) state.meetings = [];
    if (!Array.isArray(state.tasks)) state.tasks = [];
    if (!Array.isArray(state.topics)) state.topics = [];
    saveState();
    clearMeetingForm();
    renderAll();
  };
  reader.readAsText(file);
}

function importIcsFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const imported = parseIcsMeetings(reader.result);
    if (!imported.length) {
      showIcsImportStatus("No calendar events found in that .ics file.");
      return;
    }

    const meetingsByKey = new Map();
    state.meetings.forEach((meeting) => {
      meetingsByKey.set(importedMeetingKey(meeting), meeting);
    });

    imported.forEach((meeting) => {
      const key = importedMeetingKey(meeting);
      const existing = meetingsByKey.get(key);
      meetingsByKey.set(key, {
        ...existing,
        ...meeting,
        id: existing?.id || meeting.id,
        notes: existing?.notes || meeting.notes,
        createdAt: existing?.createdAt || new Date().toISOString()
      });
    });

    state.meetings = [...meetingsByKey.values()];
    try {
      await saveState({ reportErrors: true });
      clearMeetingForm();
      switchSection("meetings");
      renderAll();
      showIcsImportStatus(`Imported and saved ${imported.length} calendar meeting${imported.length === 1 ? "" : "s"}.`);
    } catch (error) {
      renderAll();
      showIcsImportStatus(`Imported ${imported.length} calendar meeting${imported.length === 1 ? "" : "s"} in this browser, but the local database save failed. Export a JSON backup before closing.`);
    }
  };
  reader.readAsText(file);
}

function showIcsImportStatus(message) {
  elements.icsImportStatus.hidden = false;
  elements.icsImportStatus.textContent = message;
}

function parseIcsMeetings(text) {
  return unfoldIcs(text)
    .split(/\r?\nBEGIN:VEVENT\r?\n|\r?\nBEGIN:VEVENT\r?\n/)
    .slice(1)
    .map((chunk) => chunk.split(/\r?\nEND:VEVENT/)[0])
    .map(parseIcsEvent)
    .filter(Boolean);
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsEvent(eventText) {
  const lines = eventText.split(/\r?\n/).filter(Boolean);
  const props = {};
  const attendees = [];

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
    if (!props[key]) props[key] = [];
    props[key].push({ value, params });
  });

  const uid = firstIcsValue(props, "UID") || crypto.randomUUID();
  const start = parseIcsDateTime(props.DTSTART?.[0]);
  const end = parseIcsDateTime(props.DTEND?.[0]);
  const title = firstIcsValue(props, "SUMMARY") || "Imported calendar event";
  const location = firstIcsValue(props, "LOCATION");

  if (!start.date) return null;
  const instanceUid = calendarInstanceUid(uid, start.date, start.time);

  return {
    id: `ics-${slugify(instanceUid)}`,
    calendarUid: instanceUid,
    title,
    project: "",
    date: start.date,
    start: start.time,
    end: end.time,
    location: location || "",
    attendees: attendees.join(", "),
    notes: "",
    createdAt: new Date().toISOString()
  };
}

function parseIcsParams(paramParts) {
  return paramParts.reduce((params, part) => {
    const [key, ...valueParts] = part.split("=");
    if (!key) return params;
    params[key.toUpperCase()] = valueParts.join("=").replace(/^"|"$/g, "");
    return params;
  }, {});
}

function firstIcsValue(props, key) {
  return props[key]?.[0]?.value || "";
}

function importedMeetingKey(meeting) {
  const calendarUid = String(meeting.calendarUid || "").trim();
  if (!calendarUid) return meeting.id;
  if (calendarUid.includes("::")) return calendarUid;
  return calendarInstanceUid(calendarUid, meeting.date, meeting.start);
}

function calendarInstanceUid(uid, date, start) {
  const occurrenceDate = String(date || "").trim().slice(0, 10) || "no-date";
  const occurrenceStart = String(start || "").trim() || "all-day";
  return [uid, occurrenceDate, occurrenceStart].join("::");
}

function parseIcsDateTime(prop) {
  if (!prop) return { date: "", time: "" };
  const value = prop.value;
  if (prop.params?.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: "" };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return { date: "", time: "" };

  if (value.endsWith("Z")) {
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00Z`);
    return {
      date: localDateIso(date),
      time: date.toTimeString().slice(0, 5)
    };
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`
  };
}

function localDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function decodeIcsText(value) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatTime(timeString) {
  if (!timeString) return "";
  const [hour, minute] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function renderNotePreview(text, { maxLines = Infinity } = {}) {
  const lines = String(text || "").split(/\r?\n/).slice(0, maxLines);
  let html = "";
  let inList = false;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const task = line.match(/^(?:task|todo|to do|action item|action|next step)\s*[:\-]\s*(.+)$/i);

    if (heading) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const level = Math.min(heading[1].length + 3, 6);
      html += `<h${level}>${renderInlineNoteText(heading[2])}</h${level}>`;
      return;
    }

    if (bullet || task) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${task ? "<strong>Task:</strong> " : ""}${renderInlineNoteText((bullet || task)[1])}</li>`;
      return;
    }

    if (line === "---") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<hr>";
      return;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }
    html += `<p>${renderInlineNoteText(line)}</p>`;
  });

  if (inList) html += "</ul>";
  return html;
}

function renderInlineNoteText(value) {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function applyNoteTool(textarea, tool) {
  if (!textarea) return;
  textarea.focus();
  if (tool === "bold") {
    wrapSelectedText(textarea, "**", "**", "bold text");
  } else if (tool === "bullet") {
    prefixSelectedLines(textarea, "- ");
  } else if (tool === "task") {
    prefixSelectedLines(textarea, "task - ");
  } else if (tool === "heading") {
    prefixSelectedLines(textarea, "## ");
  } else if (tool === "divider") {
    insertAtSelection(textarea, "\n---\n");
  }
  updateMeetingFormPreview();
  updateMeetingDialogPreview();
  updateTopicDialogPreview();
}

function wrapSelectedText(textarea, before, after, placeholder) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const replacement = `${before}${selected}${after}`;
  textarea.setRangeText(replacement, start, end, "select");
}

function prefixSelectedLines(textarea, prefix) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = end < textarea.value.length ? textarea.value.indexOf("\n", end) : textarea.value.length;
  const resolvedEnd = lineEnd === -1 ? textarea.value.length : lineEnd;
  const selected = textarea.value.slice(lineStart, resolvedEnd) || "";
  const replacement = selected
    .split("\n")
    .map((line) => line.trim() ? `${prefix}${line.replace(/^([-*]\s+|#{1,3}\s+|(?:task|todo|to do|action item|action|next step)\s*[:\-]\s*)/i, "")}` : line)
    .join("\n");
  textarea.setRangeText(replacement || prefix, lineStart, resolvedEnd, "select");
}

function insertAtSelection(textarea, text) {
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end");
}

function updateMeetingDialogPreview() {
  if (!elements.dialogMeetingNotesPreview) return;
  elements.dialogMeetingNotesPreview.innerHTML = renderNotePreview(elements.dialogMeetingNotes.value);
  elements.dialogMeetingNotesPreview.hidden = !elements.dialogMeetingNotes.value.trim();
}

function updateMeetingFormPreview() {
  if (!elements.meetingNotesPreview) return;
  elements.meetingNotesPreview.innerHTML = renderNotePreview(elements.meetingNotes.value);
  elements.meetingNotesPreview.hidden = !elements.meetingNotes.value.trim();
}

function updateTopicDialogPreview() {
  if (!elements.topicNotesPreview) return;
  elements.topicNotesPreview.innerHTML = renderNotePreview(elements.topicNotes.value);
  elements.topicNotesPreview.hidden = !elements.topicNotes.value.trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function switchSection(section) {
  activeSection = section;
  $$(".workspace-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  $$(".workspace-section").forEach((panel) => panel.classList.toggle("active", panel.id === `${section}View`));
}

function renderAll() {
  renderProjectControls();
  renderSummary();
  renderDashboardMeetings();
  renderDashboardTasks();
  renderDashboardTopics();
  renderMeetingList();
  renderSuggestions();
  renderTasks();
}

$(".workspace-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-section]");
  if (!button) return;
  switchSection(button.dataset.section);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-note-tool]");
  if (!button) return;
  const textarea = document.getElementById(button.dataset.noteTarget);
  applyNoteTool(textarea, button.dataset.noteTool);
});

function startNewMeeting() {
  clearMeetingForm();
  switchSection("meetings");
  elements.capturePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.meetingTitle.focus({ preventScroll: true });
}

elements.newMeetingButton.addEventListener("click", startNewMeeting);
elements.newMeetingButtonMeetings.addEventListener("click", startNewMeeting);
elements.newMeetingButtonList.addEventListener("click", startNewMeeting);
elements.newTopicButton.addEventListener("click", () => openTopicDialog());

elements.saveMeetingButton.addEventListener("click", () => saveMeeting());
elements.saveMeetingButtonInline.addEventListener("click", () => saveMeeting());
elements.processButton.addEventListener("click", extractSuggestions);
elements.clearMeetingButton.addEventListener("click", clearMeetingForm);
elements.deleteMeetingButton.addEventListener("click", deleteMeeting);
elements.agendaDate.addEventListener("change", () => {
  if (!elements.meetingId.value) elements.meetingDate.value = elements.agendaDate.value;
  renderAll();
});

elements.meetingList.addEventListener("click", handleMeetingAction);
elements.todayMeetings.addEventListener("click", handleMeetingAction);
elements.todayTopics.addEventListener("click", handleTopicAction);

elements.meetingDialogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveMeetingDialog();
});
elements.deleteMeetingDialogButton.addEventListener("click", () => {
  deleteMeetingById(elements.dialogMeetingId.value, { closeDialog: true });
});
elements.cancelMeetingDialogButton.addEventListener("click", () => elements.meetingDialog.close());
elements.closeMeetingDialogButton.addEventListener("click", () => elements.meetingDialog.close());
elements.meetingNotes.addEventListener("input", updateMeetingFormPreview);
elements.dialogMeetingNotes.addEventListener("input", updateMeetingDialogPreview);
elements.topicNotes.addEventListener("input", updateTopicDialogPreview);

elements.topicForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTopicFromDialog();
});
elements.deleteTopicButton.addEventListener("click", deleteTopic);
elements.cancelTopicButton.addEventListener("click", () => elements.topicDialog.close());
elements.closeTopicDialogButton.addEventListener("click", () => elements.topicDialog.close());

function handleMeetingAction(event) {
  const toggleNotes = event.target.closest("[data-toggle-notes]");
  const edit = event.target.closest("[data-edit-meeting]");
  const process = event.target.closest("[data-process-meeting]");
  const remove = event.target.closest("[data-delete-meeting]");
  if (toggleNotes) {
    const id = toggleNotes.dataset.toggleNotes;
    if (expandedMeetingNotes.has(id)) {
      expandedMeetingNotes.delete(id);
    } else {
      expandedMeetingNotes.add(id);
    }
    renderAll();
    return;
  }
  if (edit) {
    if (event.currentTarget === elements.todayMeetings) {
      openMeetingDialog(edit.dataset.editMeeting);
    } else {
      editMeeting(edit.dataset.editMeeting);
    }
  }
  if (process) {
    editMeeting(process.dataset.processMeeting);
    extractSuggestions();
  }
  if (remove) deleteMeetingById(remove.dataset.deleteMeeting);
}

function handleTopicAction(event) {
  const toggleNotes = event.target.closest("[data-toggle-topic-notes]");
  const edit = event.target.closest("[data-edit-topic]");
  const makeTask = event.target.closest("[data-topic-task]");
  const remove = event.target.closest("[data-delete-topic]");

  if (toggleNotes) {
    const id = toggleNotes.dataset.toggleTopicNotes;
    if (expandedTopicNotes.has(id)) {
      expandedTopicNotes.delete(id);
    } else {
      expandedTopicNotes.add(id);
    }
    renderAll();
    return;
  }

  if (edit) {
    openTopicDialog((state.topics || []).find((topic) => topic.id === edit.dataset.editTopic));
    return;
  }

  if (makeTask) {
    makeTaskFromTopic(makeTask.dataset.topicTask);
    return;
  }

  if (remove) {
    const topic = (state.topics || []).find((item) => item.id === remove.dataset.deleteTopic);
    if (!topic) return;
    if (!confirm(`Delete "${topic.title || "this topic"}"?`)) return;
    state.topics = state.topics.filter((item) => item.id !== topic.id);
    expandedTopicNotes.delete(topic.id);
    saveState();
    renderAll();
  }
}

elements.addSuggestionButton.addEventListener("click", () => {
  const meeting = elements.meetingId.value ? state.meetings.find((item) => item.id === elements.meetingId.value) : meetingFromForm();
  suggestions.push({
    selected: true,
    title: "",
    project: meeting?.project || "Inbox",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "Jon",
    due: "",
    meetingId: meeting?.id || "",
    notes: `Source: ${formatDate(meeting?.date || todayIso())} ${meeting?.title || ""}`.trim()
  });
  renderSuggestions();
});
elements.addSuggestionsButton.addEventListener("click", addSelectedSuggestions);
elements.newTaskButton.addEventListener("click", () => openTaskDialog());
elements.newTaskButtonTasks.addEventListener("click", () => openTaskDialog());
elements.taskSearch.addEventListener("input", () => {
  renderTasks();
  renderDashboardTasks();
});
elements.projectFilter.addEventListener("change", () => {
  renderTasks();
  renderDashboardTasks();
});

$(".view-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;
  activeView = button.dataset.view;
  $$(".view-tabs button").forEach((item) => item.classList.toggle("active", item === button));
  renderTasks();
});

function handleTaskAction(event) {
  const done = event.target.closest("[data-done]");
  const edit = event.target.closest("[data-edit]");
  const today = event.target.closest("[data-today]");
  const waiting = event.target.closest("[data-waiting]");
  if (done) {
    updateTask(done.dataset.done, done.checked
      ? { status: "Done", completedAt: new Date().toISOString() }
      : { status: "Next", completedAt: "" });
  }
  if (edit) openTaskDialog(state.tasks.find((task) => task.id === edit.dataset.edit));
  if (today) updateTask(today.dataset.today, { status: "Today" });
  if (waiting) updateTask(waiting.dataset.waiting, { status: "Waiting" });
}

elements.taskBoard.addEventListener("click", handleTaskAction);
elements.todayTaskBoard.addEventListener("click", handleTaskAction);

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTaskFromDialog();
});
elements.deleteTaskButton.addEventListener("click", deleteTask);
elements.cancelTaskButton.addEventListener("click", () => elements.taskDialog.close());
elements.closeDialogButton.addEventListener("click", () => elements.taskDialog.close());
elements.exportButton.addEventListener("click", exportData);
elements.importFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importData(file);
  event.target.value = "";
});
elements.icsFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importIcsFile(file);
  event.target.value = "";
});
elements.icsFileList.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importIcsFile(file);
  event.target.value = "";
});

async function initializeApp() {
  state = await loadState();
  saveState();
  elements.agendaDate.value = todayIso();
  elements.meetingDate.value = todayIso();
  setMeetingFormMode();
  updateMeetingFormPreview();
  renderAll();
}

initializeApp();
