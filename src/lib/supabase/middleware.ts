import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { claimsFromUser, type JwtClaims } from "@/lib/jwt-claims";

/**
 * Per-request session + role/approval gate.
 *
 * Optimized path (Phase 1.32): `supabase.auth.getUser()` validates the JWT
 * signature using the Supabase anon key + the user-supplied access token —
 * no DB hit. We then read `role`, `is_approved`, `is_banned` straight from
 * `app_metadata`, which the 005_jwt_claims trigger mirrors from profiles.
 *
 * Fallback: if claims are missing (legacy users pre-trigger), we run ONE
 * `select role, is_approved, is_banned` query — same number of hops as
 * before the optimization, but no longer on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // -------- 1. Try JWT claims (zero DB hits) --------
  let claims: JwtClaims | null = claimsFromUser(user);

  // -------- 2. Fallback: single SELECT if claims missing --------
  if (user && !claims) {
    const { data } = await supabase
      .from("profiles")
      .select("role, is_approved, is_banned")
      .eq("id", user.id)
      .single();
    if (data) {
      claims = {
        role: data.role as JwtClaims["role"],
        is_approved: !!data.is_approved,
        is_banned: !!data.is_banned,
      };
    }
  }

  // -------- 3. Ban enforcement --------
  if (claims?.is_banned) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "Your account has been banned. Contact support.");
    return NextResponse.redirect(url);
  }

  // -------- 4. Protected paths --------
  const protectedPaths = ["/feed", "/orders", "/profile", "/cart", "/seller", "/creator"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // -------- 5. Creator-only routes --------
  if (request.nextUrl.pathname.startsWith("/creator")) {
    if (!claims || claims.role !== "creator") {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  // -------- 6. Seller-only routes --------
  if (request.nextUrl.pathname.startsWith("/seller")) {
    if (!claims || (claims.role !== "seller" && claims.role !== "creator")) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }

    if (claims.role === "seller" && !claims.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/pending";
      return NextResponse.redirect(url);
    }
  }

  // -------- 7. Redirect authenticated users away from auth pages --------
  if (user && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/onboarding")) {
    if (claims?.role) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}