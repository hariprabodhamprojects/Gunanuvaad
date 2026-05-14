"use server";

import { revalidatePath } from "next/cache";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { avatarExtFromMime, validateAvatarFile } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSmrutiPostAction(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAllowlistedUser();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!caption) {
    return { ok: false, error: "Add a caption." };
  }

  const files = formData
    .getAll("images")
    .filter((x): x is File => x instanceof File && x.size > 0);

  if (files.length < 1 || files.length > 5) {
    return { ok: false, error: "Choose between 1 and 5 photos." };
  }

  for (const f of files) {
    const v = validateAvatarFile(f);
    if (v) return { ok: false, error: v };
  }

  const supabase = await createClient();
  const { data: post, error: postErr } = await supabase
    .from("smruti_posts")
    .insert({ author_id: user.id, caption })
    .select("id")
    .single();

  if (postErr || !post?.id) {
    console.error("[smruti] create post", postErr?.message);
    return { ok: false, error: postErr?.message ?? "Could not create post." };
  }

  const postId = post.id as string;
  const uploaded: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext = avatarExtFromMime(file.type);
      const path = `${postId}/${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("smruti").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        throw new Error(upErr.message);
      }
      uploaded.push(path);
    }

    const mediaRows = uploaded.map((storage_path, sort_order) => ({
      post_id: postId,
      sort_order,
      storage_path,
    }));

    const { error: mediaErr } = await supabase.from("smruti_post_media").insert(mediaRows);
    if (mediaErr) {
      throw new Error(mediaErr.message);
    }
  } catch (e) {
    if (uploaded.length) {
      await supabase.storage.from("smruti").remove(uploaded);
    }
    await supabase.from("smruti_posts").delete().eq("id", postId);
    const msg = e instanceof Error ? e.message : "Could not publish.";
    return { ok: false, error: msg };
  }

  revalidatePath("/feed");
  revalidatePath("/smruti");
  return { ok: true };
}

export async function likeSmrutiPostAction(
  postId: string,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const { user } = await requireAllowlistedUser();
  const supabase = await createClient();
  const { error } = await supabase.from("smruti_likes").insert({
    post_id: postId,
    user_id: user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: true, created: false };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/feed");
  revalidatePath("/smruti");
  return { ok: true, created: true };
}

export async function deleteSmrutiPostAction(postId: string): Promise<ActionResult> {
  await requireAllowlistedUser();
  const supabase = await createClient();

  const { data: mediaRows, error: selErr } = await supabase
    .from("smruti_post_media")
    .select("storage_path")
    .eq("post_id", postId);

  if (selErr) {
    return { ok: false, error: selErr.message };
  }

  const paths = (mediaRows ?? []).map((r) => r.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from("smruti").remove(paths);
    if (rmErr) {
      console.error("[smruti] storage remove", rmErr.message);
    }
  }

  const { error: delErr } = await supabase.from("smruti_posts").delete().eq("id", postId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  revalidatePath("/feed");
  revalidatePath("/smruti");
  return { ok: true };
}
