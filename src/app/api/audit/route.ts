import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight audit endpoint. Receives { action, metadata, ts } from
 * `lib/audit.ts` and currently just logs to the server console.
 *
 * In the future, persist to a Supabase table or external log sink here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, metadata, ts } = body ?? {};

    if (typeof action !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'action' field" },
        { status: 400 }
      );
    }

    console.log("[audit]", { action, metadata: metadata ?? {}, ts: ts ?? new Date().toISOString() });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[audit] failed to parse request", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
