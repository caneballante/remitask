import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthenticated } from "@/lib/auth";
import { extractMarkedTaskTitles } from "@/lib/task-markers";
import type { Meeting, TaskSuggestion } from "@/lib/types";

export async function POST(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { meeting?: Partial<Meeting> };
    const meeting = normalizeMeeting(payload.meeting || {});
    const tasks = extractMarkedTaskTitles(meeting.notes).map((title) => taskFromMarkedLine(title, meeting));

    return NextResponse.json({
      source: "marked-lines",
      tasks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to extract tasks." },
      { status: 500 },
    );
  }
}

function taskFromMarkedLine(title: string, meeting: Meeting): TaskSuggestion {
  return {
    selected: true,
    space: meeting.space,
    title,
    project: meeting.project || "Inbox",
    status: "Next",
    priority: "P2",
    effort: "Quick",
    energy: "Normal",
    context: "Follow-up",
    owner: "",
    due: "",
    notes: `Source: ${meeting.title}`,
    meetingId: meeting.id,
  };
}

function normalizeMeeting(meeting: Partial<Meeting>): Meeting {
  return {
    id: cleanText(meeting.id),
    space: meeting.space === "personal" ? "personal" : "work",
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

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
