"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const POST_MAX_LEN = 4000;
const REPLY_MAX_LEN = 2000;
const TOPIC_TITLE_MAX = 200;
const TOPIC_DESCRIPTION_MAX = 12_000;
const REVOKE_REASON_MAX = 500;

type ActionResult = { ok: true } | { ok: false; error: string };

function invalidatePaths() {
  revalidatePath("/swadhyay");
  revalidatePath("/admin/swadhyay");
  revalidatePath("/standings");
}

// ── Admin: topic CRUD ───────────────────────────────────────────────────────

/** Create a new weekly topic. Redirects back to /admin/swadhyay on success. */
export async function createWeeklyTopicAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const isPublished = String(formData.get("is_published") ?? "") === "true";

  if (!title || !startDate || !endDate) {
    redirect("/admin/swadhyay?error=missing-fields");
  }
  if (title.length > TOPIC_TITLE_MAX) redirect("/admin/swadhyay?error=title-too-long");
  if (description.length > TOPIC_DESCRIPTION_MAX) {
    redirect("/admin/swadhyay?error=description-too-long");
  }
  if (endDate < startDate) redirect("/admin/swadhyay?error=date-order");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/swadhyay?error=not-signed-in");

  const { error } = await supabase.from("swadhyay_topics").insert({
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    is_published: isPublished,
    posted_by: user.id,
  });

  if (error) {
    console.error("[swadhyay] createWeeklyTopicAction", error.message);
    // The most common failure is the no-overlap exclusion constraint when two
    // published windows clash — surface a specific hint so the admin can fix
    // the dates without reading the SQL error.
    const code = /daterange/i.test(error.message) ? "overlap" : "save-failed";
    redirect(`/admin/swadhyay?error=${code}`);
  }

  invalidatePaths();
  redirect("/admin/swadhyay?ok=created");
}

/** Update one topic in place. */
export async function updateWeeklyTopicAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const isPublished = String(formData.get("is_published") ?? "") === "true";

  if (!id || !title || !startDate || !endDate) {
    redirect("/admin/swadhyay?error=missing-fields");
  }
  if (title.length > TOPIC_TITLE_MAX) redirect("/admin/swadhyay?error=title-too-long");
  if (description.length > TOPIC_DESCRIPTION_MAX) {
    redirect("/admin/swadhyay?error=description-too-long");
  }
  if (endDate < startDate) redirect("/admin/swadhyay?error=date-order");

  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_topics")
    .update({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[swadhyay] updateWeeklyTopicAction", error.message);
    const code = /daterange/i.test(error.message) ? "overlap" : "save-failed";
    redirect(`/admin/swadhyay?error=${code}`);
  }

  invalidatePaths();
  redirect("/admin/swadhyay?ok=updated");
}

export async function deleteWeeklyTopicAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/swadhyay?error=missing-fields");

  const supabase = await createClient();
  const { error } = await supabase.from("swadhyay_topics").delete().eq("id", id);
  if (error) {
    console.error("[swadhyay] deleteWeeklyTopicAction", error.message);
    redirect("/admin/swadhyay?error=delete-failed");
  }

  invalidatePaths();
  redirect("/admin/swadhyay?ok=deleted");
}

// ── Admin: moderation ───────────────────────────────────────────────────────

export async function revokePostAction(
  postId: string,
  reason: string,
): Promise<ActionResult> {
  if (!postId) return { ok: false, error: "Missing post id." };
  const trimmedReason = reason.trim().slice(0, REVOKE_REASON_MAX);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("swadhyay_posts")
    .update({
      is_revoked: true,
      revoked_by: user.id,
      revoked_at: new Date().toISOString(),
      revoke_reason: trimmedReason || null,
    })
    .eq("id", postId);

  if (error) {
    console.error("[swadhyay] revokePostAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function restorePostAction(postId: string): Promise<ActionResult> {
  if (!postId) return { ok: false, error: "Missing post id." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_posts")
    .update({
      is_revoked: false,
      revoked_by: null,
      revoked_at: null,
      revoke_reason: null,
    })
    .eq("id", postId);

  if (error) {
    console.error("[swadhyay] restorePostAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

// ── User: posts ─────────────────────────────────────────────────────────────

export async function postSwadhyayReflectionAction(
  topicId: string,
  body: string,
): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!topicId) return { ok: false, error: "No active topic." };
  if (!trimmed) return { ok: false, error: "Write something before posting." };
  if (trimmed.length > POST_MAX_LEN) {
    return { ok: false, error: `Max ${POST_MAX_LEN} characters.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("swadhyay_posts").insert({
    topic_id: topicId,
    author_id: user.id,
    body: trimmed,
  });

  if (error) {
    console.error("[swadhyay] postSwadhyayReflectionAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function editPostAction(postId: string, body: string): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!postId) return { ok: false, error: "Missing post id." };
  if (!trimmed) return { ok: false, error: "Post cannot be empty." };
  if (trimmed.length > POST_MAX_LEN) {
    return { ok: false, error: `Max ${POST_MAX_LEN} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_posts")
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    console.error("[swadhyay] editPostAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  if (!postId) return { ok: false, error: "Missing post id." };
  const supabase = await createClient();
  const { error } = await supabase.from("swadhyay_posts").delete().eq("id", postId);
  if (error) {
    console.error("[swadhyay] deletePostAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function togglePostReactionAction(postId: string): Promise<ActionResult> {
  if (!postId) return { ok: false, error: "Missing post id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing, error: checkErr } = await supabase
    .from("swadhyay_post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkErr) {
    console.error("[swadhyay] togglePostReaction check", checkErr.message);
    return { ok: false, error: checkErr.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("swadhyay_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[swadhyay] togglePostReaction delete", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("swadhyay_post_reactions").insert({
      post_id: postId,
      user_id: user.id,
    });
    if (error) {
      console.error("[swadhyay] togglePostReaction insert", error.message);
      return { ok: false, error: error.message };
    }
  }

  invalidatePaths();
  return { ok: true };
}

// ── User: replies ───────────────────────────────────────────────────────────

export async function replyToPostAction(
  postId: string,
  parentReplyId: string | null,
  body: string,
): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!postId) return { ok: false, error: "Missing post id." };
  if (!trimmed) return { ok: false, error: "Reply is empty." };
  if (trimmed.length > REPLY_MAX_LEN) {
    return { ok: false, error: `Max ${REPLY_MAX_LEN} characters.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Pre-check: refuse to insert if the target post is revoked. The database
  // also has a BEFORE INSERT trigger (see migration
  // `20260420120000_swadhyay_visibility_hardening.sql`) that enforces this
  // — belt-and-suspenders. The server-side check is just nicer UX: it lets
  // us return a human-readable error instead of the raw Postgres code.
  const { data: targetPost, error: lookupErr } = await supabase
    .from("swadhyay_posts")
    .select("is_revoked")
    .eq("id", postId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[swadhyay] replyToPostAction lookup", lookupErr.message);
    return { ok: false, error: lookupErr.message };
  }
  if (!targetPost) return { ok: false, error: "Post not found." };
  if (targetPost.is_revoked) {
    return { ok: false, error: "This post was revoked — replies are closed." };
  }

  const { error } = await supabase.from("swadhyay_post_replies").insert({
    post_id: postId,
    author_id: user.id,
    parent_reply_id: parentReplyId,
    body: trimmed,
  });

  if (error) {
    console.error("[swadhyay] replyToPostAction", error.message);
    // The trigger surfaces as an errcode P0001 with a useful message; if a
    // revoke slips in between our pre-check and the insert, fall back to
    // the same friendly copy.
    if (/post is revoked/i.test(error.message)) {
      return { ok: false, error: "This post was revoked — replies are closed." };
    }
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function editReplyAction(replyId: string, body: string): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!replyId) return { ok: false, error: "Missing reply id." };
  if (!trimmed) return { ok: false, error: "Reply cannot be empty." };
  if (trimmed.length > REPLY_MAX_LEN) {
    return { ok: false, error: `Max ${REPLY_MAX_LEN} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("swadhyay_post_replies")
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq("id", replyId);

  if (error) {
    console.error("[swadhyay] editReplyAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function deleteReplyAction(replyId: string): Promise<ActionResult> {
  if (!replyId) return { ok: false, error: "Missing reply id." };
  const supabase = await createClient();
  const { error } = await supabase.from("swadhyay_post_replies").delete().eq("id", replyId);
  if (error) {
    console.error("[swadhyay] deleteReplyAction", error.message);
    return { ok: false, error: error.message };
  }

  invalidatePaths();
  return { ok: true };
}

export async function toggleReplyReactionAction(replyId: string): Promise<ActionResult> {
  if (!replyId) return { ok: false, error: "Missing reply id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing, error: checkErr } = await supabase
    .from("swadhyay_reply_reactions")
    .select("reply_id")
    .eq("reply_id", replyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkErr) {
    console.error("[swadhyay] toggleReplyReaction check", checkErr.message);
    return { ok: false, error: checkErr.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("swadhyay_reply_reactions")
      .delete()
      .eq("reply_id", replyId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[swadhyay] toggleReplyReaction delete", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("swadhyay_reply_reactions").insert({
      reply_id: replyId,
      user_id: user.id,
    });
    if (error) {
      console.error("[swadhyay] toggleReplyReaction insert", error.message);
      return { ok: false, error: error.message };
    }
  }

  invalidatePaths();
  return { ok: true };
}
