"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  redirect("/swadhyay");
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
    parent_comment_id: null,
  });
  if (error) {
    console.error("[swadhyay] postSwadhyayCommentAction", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/swadhyay");
  return { ok: true };
}

export async function replySwadhyayCommentAction(topicId: string, parentCommentId: string, body: string) {
  const trimmed = body.trim();
  if (!topicId || !parentCommentId || !trimmed) return { ok: false, error: "Reply is empty." };
  if (trimmed.length > COMMENT_MAX_LEN) return { ok: false, error: `Max ${COMMENT_MAX_LEN} characters.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("swadhyay_comments").insert({
    topic_id: topicId,
    author_id: user.id,
    parent_comment_id: parentCommentId,
    body: trimmed,
  });
  if (error) {
    console.error("[swadhyay] replySwadhyayCommentAction", error.message);
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

export async function toggleSwadhyayCommentReactionAction(commentId: string) {
  if (!commentId) return { ok: false, error: "Missing comment id." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing, error: checkErr } = await supabase
    .from("swadhyay_comment_reactions")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkErr) {
    console.error("[swadhyay] toggle reaction check", checkErr.message);
    return { ok: false, error: checkErr.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("swadhyay_comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[swadhyay] toggle reaction delete", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("swadhyay_comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
    });
    if (error) {
      console.error("[swadhyay] toggle reaction insert", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/swadhyay");
  return { ok: true };
}

export async function pinSwadhyayCommentAction(topicId: string, commentId: string | null) {
  if (!topicId) return { ok: false, error: "Missing topic id." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_topics")
    .update({ pinned_comment_id: commentId, updated_at: new Date().toISOString() })
    .eq("id", topicId);
  if (error) {
    console.error("[swadhyay] pinSwadhyayCommentAction", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/swadhyay");
  revalidatePath("/admin/swadhyay");
  return { ok: true };
}
