import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NotificationsInbox } from "./notifications-inbox";

export const metadata: Metadata = {
  title: "Notifications · CampusCravings",
  description: "Your recent activity, messages, and order updates.",
  robots: { index: false, follow: false },
};

/**
 * Personal inbox for the current user's notifications.
 *
 * Server component so we can keep the `metadata` export (and the `noindex`
 * robots directive). Auth is checked here and unauthenticated visitors are
 * sent back to the marketing landing.
 *
 * Realtime + optimistic read state live in the client island below.
 */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return <NotificationsInbox />;
}
