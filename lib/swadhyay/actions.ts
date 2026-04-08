"use server";

import { revalidatePath } from "next/cache";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { createClient } from "@/lib/supabase/server";

const COMMENT_MAX_LEN = 2000;

export async function saveTodaySwadhyayTopicAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scriptureRef = String(formData.get("scripture_ref") ?? "").trim();
  const isPublished = String(formData.get("is_published") ?? "") === "true";
  const campaignDate = getCampaignDateTodayISO();

  if (!title || !body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("swadhyay_topics").upsert(
    {
      campaign_date: campaignDate,
      title,
      body,
      scripture_ref: scriptureRef || null,
      is_published: isPublished,
      posted_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_date" },
  );

  if (error) {
    console.error("[swadhyay] saveTodaySwadhyayTopicAction", error.message);
    return;
  }

  revalidatePath("/swadhyay");
  revalidatePath("/admin/swadhyay");
}

export async function postSwadhyayCommentAction(topicId: string, body: string) {
  const trimmed = body.trim();
  if (!topicId || !trimmed) return { ok: false, error: "Comment is empty." };
  if (trimmed.length > COMMENT_MAX_LEN) return { ok: false, error: `Max ${COMMENT_MAX_LEN} characters.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("swadhyay_comments").insert({
    topic_id: topicId,
    author_id: user.id,
    body: trimmed,
  });
  if (error) {
    console.error("[swadhyay] postSwadhyayCommentAction", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/swadhyay");
  return { ok: true };
}

export async function editSwadhyayCommentAction(commentId: string, body: string) {
  const trimmed = body.trim();
  if (!commentId || !trimmed) return { ok: false, error: "Comment is empty." };
  if (trimmed.length > COMMENT_MAX_LEN) return { ok: false, error: `Max ${COMMENT_MAX_LEN} characters.` };

  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_comments")
    .update({
      body: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);
  if (error) {
    console.error("[swadhyay] editSwadhyayCommentAction", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/swadhyay");
  return { ok: true };
}

export async function deleteSwadhyayCommentAction(commentId: string) {
  if (!commentId) return { ok: false, error: "Missing comment id." };
  const supabase = await createClient();
  const { error } = await supabase.from("swadhyay_comments").delete().eq("id", commentId);
  if (error) {
    console.error("[swadhyay] deleteSwadhyayCommentAction", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/swadhyay");
  return { ok: true };
}
