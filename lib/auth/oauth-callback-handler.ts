import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { PENDING_SIGNIN_COOKIE } from "@/lib/auth/pending-signin-cookie";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

const ALLOWLIST_ATTEMPTS = 4;
const PROFILE_ATTEMPTS = 5;
const RETRY_MS = 280;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Route handlers must write session cookies onto the redirect response itself.
 * Setting only `cookies()` often drops Set-Cookie on Vercel — first sign-in fails,
 * retry works because the second OAuth round trip succeeds after partial state.
 */
function createCallbackClient(
  response: NextResponse,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              /* Server Component context — response still gets cookies */
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}

async function isAllowlistedWithRetry(supabase: SupabaseClient): Promise<
  | { ok: true }
  | { ok: false; reason: "not_invited" }
  | { ok: false; reason: "error" }
> {
  for (let attempt = 0; attempt < ALLOWLIST_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("is_allowlisted_session");
    if (!error && data === true) return { ok: true };
    if (!error && data === false) return { ok: false, reason: "not_invited" };
    if (error) {
      console.error("[auth/callback] is_allowlisted_session", error.message, { attempt });
    }
    if (attempt < ALLOWLIST_ATTEMPTS - 1) await sleep(RETRY_MS * (attempt + 1));
  }
  return { ok: false, reason: "error" };
}

type ProfileRow = { display_name: string | null; avatar_url: string | null };

async function loadProfileWithRetry(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  for (let attempt = 0; attempt < PROFILE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) return data;
    if (error) {
      console.error("[auth/callback] profile load", error.message, { attempt });
    }
    if (attempt < PROFILE_ATTEMPTS - 1) await sleep(RETRY_MS * (attempt + 1));
  }
  return null;
}

function needsOnboarding(profile: ProfileRow | null): boolean {
  return !profile?.display_name?.trim() || !profile?.avatar_url?.trim();
}

export async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/home";
  const next = nextRaw.startsWith("/") ? nextRaw : "/home";
  const oauthError = url.searchParams.get("error");
  const origin = url.origin;

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  // One redirect response for the whole handler — session cookies must stay on it.
  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createCallbackClient(response, cookieStore);

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession", exchangeError.message);
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const user: User | null = exchangeData.session?.user ?? null;
  if (!user) {
    console.error("[auth/callback] exchange succeeded but no user on session");
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  cookieStore.delete(PENDING_SIGNIN_COOKIE);

  const allowlist = await isAllowlistedWithRetry(supabase);
  if (!allowlist.ok) {
    if (allowlist.reason === "not_invited") {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/not-invited`);
    }
    // Transient DB/RPC failure — do not sign out; user can retry without re-picking Google.
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const { error: syncErr } = await supabase.rpc("sync_invited_display_name");
  if (syncErr) {
    console.error("[auth/callback] sync_invited_display_name", syncErr.message);
  }

  const profile = await loadProfileWithRetry(supabase, user.id);
  const destination = needsOnboarding(profile) ? "/onboarding" : next;

  if (destination !== next) {
    response.headers.set("Location", `${origin}${destination}`);
  }

  return response;
}
