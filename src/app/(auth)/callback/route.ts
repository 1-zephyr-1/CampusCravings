import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BRACU_DOMAIN } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Validate BRACU domain server-side
      const email = data.user.email;
      if (!email || !email.endsWith(`@${BRACU_DOMAIN}`)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}?error=Only+BRAC+University+students+(@${BRACU_DOMAIN})+are+allowed+to+sign+in.`
        );
      }

      // Also check the hd claim from the ID token if available
      const app_metadata = data.user.app_metadata;
      if (app_metadata && app_metadata.provider === "google") {
        // The hd field should match our domain
        // This is checked via Google's hd parameter in the OAuth URL
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

        await supabase.from("profiles").insert({
          id: data.user.id,
          email: email,
          full_name: data.user.user_metadata?.full_name || "",
          avatar_url: data.user.user_metadata?.avatar_url || null,
          role: isCreator ? "creator" : "customer",
          is_approved: isCreator,
        });

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
  }

  // Return the error message if no code
  return NextResponse.redirect(
    `${origin}?error=Authentication+failed.+Please+try+again.`
  );
}
