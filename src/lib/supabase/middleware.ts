import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
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

  // Protected routes
  const protectedPaths = ["/feed", "/orders", "/profile", "/cart", "/seller", "/creator"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Creator-only routes
  if (request.nextUrl.pathname.startsWith("/creator")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();

    if (!profile || profile.role !== "creator") {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  // Seller-only routes
  if (request.nextUrl.pathname.startsWith("/seller")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user!.id)
      .single();

    if (!profile || (profile.role !== "seller" && profile.role !== "creator")) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }

    if (profile.role === "seller" && !profile.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname === "/onboarding")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
