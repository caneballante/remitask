import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthenticated } from "@/lib/auth";
import { applyStateChanges, isMovableEntityKind, isSpace, loadState, moveItem } from "@/lib/state-db";
import type { StateChanges } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const space = request.nextUrl.searchParams.get("space") || "work";
    if (!isSpace(space)) return NextResponse.json({ error: "Invalid space." }, { status: 400 });
    return NextResponse.json(await loadState(space));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load state" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const space = request.nextUrl.searchParams.get("space") || "work";
    if (!isSpace(space)) return NextResponse.json({ error: "Invalid space." }, { status: 400 });
    const body = (await request.json()) as { changes?: unknown };
    if (!isStateChanges(body.changes)) {
      return NextResponse.json({ error: "Invalid state changes." }, { status: 400 });
    }
    await applyStateChanges(space, body.changes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save state" },
      { status: 500 },
    );
  }
}

function isStateChanges(value: unknown): value is StateChanges {
  if (!value || typeof value !== "object") return false;
  const changes = value as Partial<StateChanges>;
  return [changes.meetings, changes.tasks, changes.topics].every((entityChanges) => {
    if (!entityChanges || !Array.isArray(entityChanges.upsert) || !Array.isArray(entityChanges.deleteIds)) return false;
    return (
      entityChanges.upsert.every(
        (item) => Boolean(item && typeof item === "object" && typeof item.id === "string" && isSpace(item.space)),
      ) && entityChanges.deleteIds.every((id) => typeof id === "string")
    );
  });
}

export async function PATCH(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sourceSpace = request.nextUrl.searchParams.get("space") || "work";
    if (!isSpace(sourceSpace)) return NextResponse.json({ error: "Invalid source space." }, { status: 400 });
    const body = (await request.json()) as {
      kind?: unknown;
      id?: unknown;
      targetSpace?: unknown;
      includeLinkedTasks?: unknown;
    };
    if (!isMovableEntityKind(body.kind) || typeof body.id !== "string" || !isSpace(body.targetSpace)) {
      return NextResponse.json({ error: "Invalid move request." }, { status: 400 });
    }
    await moveItem(body.kind, body.id, sourceSpace, body.targetSpace, body.includeLinkedTasks === true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to move item" },
      { status: 500 },
    );
  }
}
