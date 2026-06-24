import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: false,
      database: "not_configured",
    });
  }

  try {
    const result = await checkDatabase();
    return NextResponse.json({
      ok: true,
      database: "ok",
      checkedAt: result.now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
