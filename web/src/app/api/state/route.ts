import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthenticated } from "@/lib/auth";
import { loadState, saveState } from "@/lib/state-db";

export async function GET(request: NextRequest) {
  if (!requestIsAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await loadState());
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
    const state = await request.json();
    return NextResponse.json(await saveState(state));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save state" },
      { status: 500 },
    );
  }
}
