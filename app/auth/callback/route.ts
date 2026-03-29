import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PENDING_SIGNIN_COOKIE } from "@/lib/auth/pending-signin-cookie";

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  cookieStore.delete(PENDING_SIGNIN_COOKIE);

  const { data: allowed, error: allowErr } = await supabase.rpc("is_allowlisted_session");

  if (allowErr) {
    console.error("[auth/callback] is_allowlisted_session", allowErr.message);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/not-invited`);
  }

  const { error: syncErr } = await supabase.rpc("sync_invited_display_name");
  if (syncErr) {
    console.error("[auth/callback] sync_invited_display_name", syncErr.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const needsOnboarding =
    !profile?.display_name?.trim() || !profile?.avatar_url?.trim();

  const destination = needsOnboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
