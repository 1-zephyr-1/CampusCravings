"use server";

import { createClient } from "@/lib/supabase/server";
import { BRACU_DOMAIN, CREATOR_EMAIL } from "@/lib/constants";

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  // Validate BRACU domain
  if (!email.endsWith(`@${BRACU_DOMAIN}`)) {
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
  // Validate BRACU domain
  if (!email.endsWith(`@${BRACU_DOMAIN}`)) {
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
