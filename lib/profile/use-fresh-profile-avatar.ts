"use client";

import { useCallback, useEffect, useState } from "react";
import { displayAvatarUrl } from "@/lib/profile/avatar-display";
import { createClient } from "@/lib/supabase/client";

export const PROFILE_AVATAR_UPDATED_EVENT = "mc:profile-avatar-updated";

type AvatarUpdatedDetail = { avatarUrl: string };

/**
 * Keeps the signed-in user's avatar URL fresh on PWA / mobile (HTTP cache + stale RSC props).
 * Refetches from Supabase when the app becomes visible and when a photo is saved.
 */
export function useFreshProfileAvatar(userId: string, initialUrl: string): string {
  const [url, setUrl] = useState(() => displayAvatarUrl(initialUrl) ?? initialUrl);

  const applyUrl = useCallback((stored: string | null | undefined, updatedAt?: string | null) => {
    const next = displayAvatarUrl(stored, updatedAt);
    if (next) setUrl(next);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[profile] refresh avatar", error.message);
      return;
    }
    applyUrl(data?.avatar_url, data?.updated_at);
  }, [userId, applyUrl]);

  useEffect(() => {
    applyUrl(initialUrl);
  }, [initialUrl, applyUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onPageShow = () => void refresh();
    const onAvatarUpdated = (e: Event) => {
      const detail = (e as CustomEvent<AvatarUpdatedDetail>).detail;
      if (detail?.avatarUrl) applyUrl(detail.avatarUrl);
      else void refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onPageShow);
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onPageShow);
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated);
    };
  }, [refresh, applyUrl]);

  return url;
}

export function notifyProfileAvatarUpdated(avatarUrl: string) {
  window.dispatchEvent(
    new CustomEvent<AvatarUpdatedDetail>(PROFILE_AVATAR_UPDATED_EVENT, {
      detail: { avatarUrl },
    }),
  );
}
