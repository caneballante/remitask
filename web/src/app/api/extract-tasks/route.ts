import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthenticated } from "@/lib/auth";
import type { Meeting, TaskSuggestion } from "@/lib/types";

const TASK_STATUSES = ["Inbox", "Today", "Next", "Waiting", "Scheduled", "Done", "Someday"] as const;
const TASK_PRIORITIES = ["P1", "P2", "P3"] as const;
const TASK_EFFORTS = ["Quick", "Medium", "Deep"] as const;
const TASK_ENERGIES = ["Low-focus", "Normal", "High-focus"] as const;
const TASK_CONTEXTS = ["Email", "Meeting", "Writing", "Website", "Design", "Follow-up", "Admin"] as const;

type OpenAiTask = Partial<Omit<TaskSuggestion, "selected">>;

export async function POST(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as { meeting?: Partial<Meeting>; projects?: unknown[] };
    const meeting = normalizeMeeting(payload.meeting || {});
    const projects = (Array.isArray(payload.projects) ? payload.projects : [])
      .filter((project): project is string => typeof project === "string")
      .map((project) => project.trim())
      .filter(Boolean);

    const body = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "developer",
          content:
            "Extract actionable task suggestions from meeting notes for a personal task dashboard. Infer implied tasks from context, but do not invent unrelated work. Return concise task titles. Use an existing known project when it fits; otherwise use the meeting project or Inbox. Use due as YYYY-MM-DD only when the notes clearly state a date; otherwise use an empty string. Use Waiting only for items owned by someone else.",
        },
        {
          role: "user",
          content: JSON.stringify({
            meeting: {
              title: cleanText(meeting.title),
              project: cleanText(meeting.project),
              date: cleanText(meeting.date),
              attendees: cleanText(meeting.attendees),
              notes: cleanText(meeting.notes),
            },
            knownProjects: projects,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "meeting_task_suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
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
                  properties: {
                    title: { type: "string" },
                    project: { type: "string" },
                    status: { type: "string", enum: TASK_STATUSES },
                    priority: { type: "string", enum: TASK_PRIORITIES },
                    effort: { type: "string", enum: TASK_EFFORTS },
                    energy: { type: "string", enum: TASK_ENERGIES },
                    context: { type: "string", enum: TASK_CONTEXTS },
                    owner: { type: "string" },
                    due: { type: "string" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      max_output_tokens: 2000,
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `OpenAI request failed with ${response.status}: ${detail}` },
        { status: 502 },
      );
    }

    const result = (await response.json()) as Record<string, unknown>;
    const parsed = JSON.parse(extractResponseText(result)) as { tasks?: OpenAiTask[] };
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    return NextResponse.json({
      source: "openai",
      model: body.model,
      tasks: tasks.map((task) => normalizeAiTask(task, meeting)).filter((task) => task.title),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to extract tasks." },
      { status: 500 },
    );
  }
}

function extractResponseText(result: Record<string, unknown>) {
  if (typeof result.output_text === "string") return result.output_text;

  const texts: string[] = [];
  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        texts.push((part as { text: string }).text);
      }
    }
  }

  if (!texts.length) throw new Error("OpenAI response did not include text output.");
  return texts.join("\n");
}

function normalizeAiTask(task: OpenAiTask, meeting: Meeting): TaskSuggestion {
  const status = pickValue(task.status, TASK_STATUSES, "Next");
  return {
    selected: true,
    title: cleanText(task.title),
    project: cleanText(task.project) || meeting.project || "Inbox",
    status,
    priority: pickValue(task.priority, TASK_PRIORITIES, "P2"),
    effort: pickValue(task.effort, TASK_EFFORTS, "Quick"),
    energy: pickValue(task.energy, TASK_ENERGIES, "Normal"),
    context: pickValue(task.context, TASK_CONTEXTS, "Follow-up"),
    owner: cleanText(task.owner) || (status === "Waiting" ? "" : "Jon"),
    due: cleanText(task.due),
    notes: cleanText(task.notes) || `Source: ${meeting.title}`,
    meetingId: meeting.id,
  };
}

function normalizeMeeting(meeting: Partial<Meeting>): Meeting {
  return {
    id: cleanText(meeting.id),
    calendarUid: cleanText(meeting.calendarUid),
    title: cleanText(meeting.title) || "Untitled meeting",
    project: cleanText(meeting.project),
    date: cleanText(meeting.date),
    start: cleanText(meeting.start),
    end: cleanText(meeting.end),
    location: cleanText(meeting.location),
    attendees: cleanText(meeting.attendees),
    notes: cleanText(meeting.notes),
    createdAt: cleanText(meeting.createdAt),
    updatedAt: cleanText(meeting.updatedAt),
  };
}

function pickValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
