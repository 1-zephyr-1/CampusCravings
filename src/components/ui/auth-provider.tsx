"use client";

import { useSupabase } from "@/lib/supabase/use-client";
import { Profile } from "@/types";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { claimsFromUser, type JwtClaims } from "@/lib/jwt-claims";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  /** True when role/approval were pulled from the JWT (no DB hit). */
  claimsReady: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  claimsReady: false,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Build a synthetic Profile from JWT claims when the trigger has populated
 * `app_metadata`. Lets us avoid a DB round-trip on initial render and still
 * render role-gated UI instantly.
 */
function profileFromClaims(
  userId: string,
  email: string | undefined,
  claims: JwtClaims
): Profile {
  return {
    id: userId,
    email: email || "",
    full_name: "",
    avatar_url: null,
    role: claims.role,
    is_approved: claims.is_approved,
    is_banned: claims.is_banned,
    created_at: "",
    updated_at: "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claimsReady, setClaimsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      setClaimsReady(false);
    }
  }

  async function refreshProfile() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;
    setUser(currentUser);
    const claims = claimsFromUser(currentUser);
    if (claims) {
      setProfile(profileFromClaims(currentUser.id, currentUser.email, claims));
      setClaimsReady(true);
    } else {
      await fetchProfile(currentUser.id);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(currentUser);
      if (currentUser) {
        const claims = claimsFromUser(currentUser);
        if (claims) {
          // Fast path: claims-based profile, no DB hit.
          setProfile(
            profileFromClaims(currentUser.id, currentUser.email, claims)
          );
          setClaimsReady(true);
        } else {
          // Fallback for legacy users (pre-trigger): still only 1 DB read.
          await fetchProfile(currentUser.id);
        }
      }
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          const claims = claimsFromUser(nextUser);
          if (claims) {
            setProfile(
              profileFromClaims(nextUser.id, nextUser.email, claims)
            );
            setClaimsReady(true);
          } else {
            await fetchProfile(nextUser.id);
          }
        } else {
          setProfile(null);
          setClaimsReady(false);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // fetchProfile is intentionally omitted: it's a fresh closure each render
    // and only used inside the auth-state callback, so adding it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, profile, claimsReady, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}