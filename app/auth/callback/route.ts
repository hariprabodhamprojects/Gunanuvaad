import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PENDING_SIGNIN_COOKIE } from "@/lib/auth/pending-signin-cookie";
import { getUserWithTimeout, rpcBooleanWithTimeout } from "@/lib/supabase/auth-timeout";

const CALLBACK_AUTH_MS = 8_000;

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("supabase_auth_timeout")), ms);
  });
}

/**
 * OAuth (Google) returns here with `?code=`. We exchange it for a session cookie (PKCE),
 * then require the signed-in email to be on `allowed_emails` via `is_allowlisted_session()`.
 * Add this URL in Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/home";
  const next = nextRaw.startsWith("/") ? nextRaw : "/home";
  const error = searchParams.get("error");
  const origin = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  let exchangeError: { message: string } | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.exchangeCodeForSession(code),
      timeoutPromise(CALLBACK_AUTH_MS),
    ]);
    exchangeError = result.error;
  } catch {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const { user, timedOut: userTimedOut } = await getUserWithTimeout(
    supabase,
    CALLBACK_AUTH_MS,
  );

  if (userTimedOut || !user) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  cookieStore.delete(PENDING_SIGNIN_COOKIE);

  const { value: allowed, timedOut: allowTimedOut, error: allowErr } =
    await rpcBooleanWithTimeout(supabase, "is_allowlisted_session", CALLBACK_AUTH_MS);

  if (allowTimedOut || allowErr) {
    if (allowErr) console.error("[auth/callback] is_allowlisted_session", allowErr.message);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/not-invited`);
  }

  try {
    const { error: syncErr } = await Promise.race([
      supabase.rpc("sync_invited_display_name"),
      timeoutPromise(CALLBACK_AUTH_MS),
    ]);
    if (syncErr) {
      console.error("[auth/callback] sync_invited_display_name", syncErr.message);
    }
  } catch {
    /* non-blocking */
  }

  let profile: { display_name: string | null; avatar_url: string | null } | null = null;
  try {
    const { data } = await Promise.race([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      timeoutPromise(CALLBACK_AUTH_MS),
    ]);
    profile = data;
  } catch {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const needsOnboarding =
    !profile?.display_name?.trim() || !profile?.avatar_url?.trim();

  const destination = needsOnboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
