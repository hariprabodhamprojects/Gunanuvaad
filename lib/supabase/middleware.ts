import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

/** Cold Vercel + Supabase after deploy can exceed 4s; timing out skips cookie refresh → mass sign-out. */
const SESSION_REFRESH_TIMEOUT_MS = 12_000;

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

/**
 * Skip remote auth refresh for anonymous landing traffic (biggest spike during link shares).
 * App routes and OAuth still refresh every time.
 */
function shouldRefreshSession(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;

  // Do not call getUser() while the route handler is exchanging the OAuth code (race / wasted work).
  if (pathname.startsWith("/auth/callback") && searchParams.has("code")) {
    return false;
  }

  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname.startsWith("/onboarding")) return true;

  const appPrefixes = [
    "/home",
    "/feed",
    "/standings",
    "/swadhyay",
    "/smruti",
    "/calendar",
    "/me",
    "/admin",
    "/pick",
  ];
  if (appPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }

  if (pathname === "/" && hasSupabaseAuthCookies(request)) return true;

  return false;
}

async function refreshSessionWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
): Promise<void> {
  await Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("session_refresh_timeout")), SESSION_REFRESH_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Refreshes the auth cookie on navigations that need it.
 * Anonymous `/` visits skip Supabase entirely to survive traffic spikes.
 */
export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  if (!shouldRefreshSession(request)) {
    return NextResponse.next({ request });
  }

  if (!hasSupabaseAuthCookies(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    await refreshSessionWithTimeout(supabase);
  } catch (error) {
    console.error("[middleware] session refresh failed — continuing without blocking", error);
    try {
      await refreshSessionWithTimeout(supabase);
    } catch (retryError) {
      console.error("[middleware] session refresh retry failed", retryError);
    }
  }

  return supabaseResponse;
}
