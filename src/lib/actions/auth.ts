"use server";

import { createClient } from "@/lib/supabase/server";
import { BRACU_DOMAIN, CREATOR_EMAIL } from "@/lib/constants";
import { headers } from "next/headers";

function isBracuEmail(email: string): boolean {
  const parts = email.split("@");
  return parts.length === 2 && parts[1] === BRACU_DOMAIN;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  // Validate BRACU domain — strict domain check, not suffix
  if (!isBracuEmail(email)) {
    return { error: `Only BRAC University students (@${BRACU_DOMAIN}) can sign up.` };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const isCreator = email === CREATOR_EMAIL;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: isCreator ? "creator" : "customer",
      is_approved: isCreator,
    });

    if (profileError) {
      return { error: "Failed to create profile. Please try again." };
    }
  }

  return { success: "Check your email for a verification link!" };
}

export async function signInWithEmail(email: string, password: string) {
  // Validate BRACU domain — strict
  if (!isBracuEmail(email)) {
    return { error: `Only BRAC University students (@${BRACU_DOMAIN}) can sign in.` };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if profile exists, create if not (for email/password users)
  if (data.user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .single();

    if (!existingProfile) {
      const isCreator = email === CREATOR_EMAIL;
      await supabase.from("profiles").insert({
        id: data.user.id,
        email: email,
        full_name: data.user.user_metadata?.full_name || "",
        role: isCreator ? "creator" : "customer",
        is_approved: isCreator,
      });
    }
  }

  return { success: true };
}

/**
 * Kick off a password reset email. We intentionally accept any email format
 * (and return a success message) so that we don't leak which addresses are
 * registered. BRACU-domain validation is still enforced server-side by the
 * Supabase redirect: the user can only land on /reset-password if their
 * address is recognised and on the allowed domain.
 */
export async function requestPasswordReset(email: string) {
  if (!email || !email.trim()) {
    return { error: "Email is required." };
  }
  if (!isBracuEmail(email)) {
    return {
      error: `Only BRAC University emails (@${BRACU_DOMAIN}) can reset a password.`,
    };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    headerList.get("x-forwarded-origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Check your inbox. If an account exists for that address, we've sent a reset link.",
  };
}
