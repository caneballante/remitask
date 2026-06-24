import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  isAuthRequired,
  requestIsAuthenticated,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authRequired: isAuthRequired(),
    authenticated: requestIsAuthenticated(request),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };

  if (!verifyPassword(body.password || "")) {
    return NextResponse.json(
      { authRequired: isAuthRequired(), authenticated: false, error: "Incorrect password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    authRequired: isAuthRequired(),
    authenticated: true,
  });
  setSessionCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    authRequired: isAuthRequired(),
    authenticated: !isAuthRequired(),
  });
  clearSessionCookie(response);
  return response;
}
