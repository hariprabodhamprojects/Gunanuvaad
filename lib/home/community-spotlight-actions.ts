"use server";

import { createClient } from "@/lib/supabase/server";

/** Move to the next spotlight deck after the user finishes one full carousel loop. */
export async function advanceCommunitySpotlightDeck(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("community_spotlight_advance_deck");

  if (error) {
    console.error("[home] community_spotlight_advance_deck", error.message);
    return { ok: false };
  }

  return { ok: true };
}
