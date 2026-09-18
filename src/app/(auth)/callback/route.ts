import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BRACU_DOMAIN } from "@/lib/constants";

/**
 * Builds a redirect to the friendly /auth/error page, encoding the message
 * in the query string. We use this for every recoverable failure path so
 * the user always lands somewhere actionable instead of being bounced
 * silently back to the landing page.
 */
function authErrorRedirect(origin: string, message: string) {
  const url = new URL("/auth/error", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (!code) {
    return authErrorRedirect(
      origin,
      "The sign-in link was missing required information. Please try again."
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return authErrorRedirect(
      origin,
      "This sign-in link has expired or already been used. Please try signing in again."
    );
  }

  // Validate BRACU domain server-side — strict
  const email = data.user.email;
  if (!email || email.split("@")[1] !== BRACU_DOMAIN) {
    await supabase.auth.signOut();
    return authErrorRedirect(
      origin,
      `Only BRAC University students (@${BRACU_DOMAIN}) are allowed to sign in.`
    );
  }

  // Check if profile exists, create if not
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .single();

  if (!existingProfile) {
    // First time sign-in — check if this is the creator email
    const { CREATOR_EMAIL } = await import("@/lib/constants");
    const isCreator = email === CREATOR_EMAIL;

    const { error: insertError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email: email,
      full_name: data.user.user_metadata?.full_name || "",
      avatar_url: data.user.user_metadata?.avatar_url || null,
      role: isCreator ? "creator" : "customer",
      is_approved: isCreator,
    });

    if (insertError) {
      await supabase.auth.signOut();
      return authErrorRedirect(
        origin,
        "We couldn't finish setting up your account. Please try signing in again."
      );
    }

    if (isCreator) {
      return NextResponse.redirect(`${origin}/feed`);
    }

    // New users go to onboarding
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Existing user — check if they have a role
  if (!existingProfile.role) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
