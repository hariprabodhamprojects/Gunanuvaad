import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match app routes only — skip static assets and PWA metadata so link spikes
     * do not run auth refresh on every icon/manifest request.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest|robots|sitemap|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
