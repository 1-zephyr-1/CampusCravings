"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CreatorActionType =
  | "user.ban"
  | "user.unban"
  | "seller.approve"
  | "seller.revoke"
  | "listing.delete"
  | "listing.hide"
  | "listing.unhide"
  | "report.reviewed"
  | "report.resolved"
  | "report.dismissed";

export interface CreatorActionLogInput {
  action_type: CreatorActionType;
  /** Optional target table referenced by target_id (e.g. "profiles", "stores"). */
  target_type?: string;
  /** Affected row id, if applicable. */
  target_id?: string;
  /** Short human label, e.g. the user's full name, used in activity log display. */
  target_label?: string;
  /** Extra structured details. Stored as JSONB. */
  metadata?: Record<string, unknown>;
}

/**
 * Records a row in `creator_actions` if the table exists. Failures are swallowed
 * because this is a best-effort log; admin actions should still succeed when
 * the table is missing (e.g. before migrations are applied).
 *
 * Resolves the actor from the current session and stores `actor_id` +
 * `actor_email` for display in the activity feed.
 */
export async function logCreatorAction(
  supabase: SupabaseClient,
  input: CreatorActionLogInput,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const row = {
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action_type: input.action_type,
      target_type: input.target_type ?? null,
      target_id: input.target_id ?? null,
      target_label: input.target_label ?? null,
      metadata: input.metadata ?? {},
    };

    await supabase.from("creator_actions").insert(row);
  } catch {
    // Best-effort: never let logging break an admin action.
  }
}

/**
 * Lightweight probe to check whether the `creator_actions` table exists in the
 * current schema. We attempt a cheap `select id limit 0` against it and treat
 * any error (typically 42P01 "relation does not exist") as "no table".
 */
export async function creatorActionsTableExists(
  supabase: SupabaseClient,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("creator_actions")
      .select("id", { head: true, count: "exact" })
      .limit(0);
    return !error;
  } catch {
    return false;
  }
}