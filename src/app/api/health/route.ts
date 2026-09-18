import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_VERSION = "0.1.0";

// Module-scope timestamp — captured on first import so uptime reflects
// process boot, not the first GET. On a serverless platform this will
// reset per cold start, which is the expected behavior for a per-instance
// uptime gauge.
const bootedAt = Date.now();

/**
 * GET /api/health
 *
 * Returns a small JSON snapshot of the service. Used by uptime monitors
 * and as a quick sanity check during development.
 *
 * The Supabase check:
 *  - If `NEXT_PUBLIC_SUPABASE_URL` is set, we ping its `/auth/v1/health`
 *    endpoint (a lightweight endpoint that doesn't require auth) and
 *    report `"ok"` on 2xx, `"degraded"` on any other status, or
 *    `"unreachable"` on a network error.
 *  - If the URL is missing, we report `"configured"` to indicate the env
 *    var is intentionally absent (e.g. local dev without Supabase).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseStatus: "ok" | "degraded" | "unreachable" | "configured";

  if (!supabaseUrl) {
    supabaseStatus = "configured";
  } else {
    supabaseStatus = await pingSupabase(supabaseUrl);
  }

  return NextResponse.json(
    {
      status: "ok",
      version: APP_VERSION,
      uptime: Math.floor((Date.now() - bootedAt) / 1000),
      checks: {
        supabase: supabaseStatus,
      },
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}

async function pingSupabase(
  url: string,
): Promise<"ok" | "degraded" | "unreachable"> {
  const healthUrl = `${url.replace(/\/$/, "")}/auth/v1/health`;
  try {
    const res = await fetch(healthUrl, {
      // 3s ceiling so the health endpoint never feels slow.
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok ? "ok" : "degraded";
  } catch {
    return "unreachable";
  }
}