"use server";

import { revalidatePath } from "next/cache";

/** Refresh server-rendered profile avatar (header + /me) after client-side upload. */
export async function revalidateAppProfileCaches() {
  revalidatePath("/me", "page");
  revalidatePath("/home", "layout");
  revalidatePath("/feed", "layout");
  revalidatePath("/standings", "layout");
  revalidatePath("/swadhyay", "layout");
  revalidatePath("/smruti", "layout");
}
