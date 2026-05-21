"use server";

import { persistUserAvatar } from "@/lib/profile/avatar";
import { revalidateAppProfileCaches } from "@/lib/profile/revalidate-profile";
import { createClient } from "@/lib/supabase/server";

export type SaveProfileAvatarResult =
  | { profileAvatarUrl: string }
  | { error: string };

/** Save avatar using the server session (reliable storage RLS + profile update). */
export async function saveProfileAvatarAction(file: File): Promise<SaveProfileAvatarResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { error: "Your session expired. Sign in again." };
  }

  const result = await persistUserAvatar(supabase, user.id, file);
  if ("error" in result) {
    return result;
  }

  await revalidateAppProfileCaches();
  return result;
}
