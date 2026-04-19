"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { restorePostAction, revokePostAction } from "@/lib/swadhyay/actions";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import type { SwadhyayPost, SwadhyayTopic } from "@/lib/swadhyay/types";
import { cn } from "@/lib/utils";

type Props = {
  /** All topics the admin can moderate (published + drafts). */
  topics: SwadhyayTopic[];
  /** Optional pre-selected topic id (defaults to the first one). */
  initialTopicId?: string;
};

function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function SwadhyayModerationList({ topics, initialTopicId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(
    initialTopicId ?? topics[0]?.id ?? "",
  );
  const [posts, setPosts] = useState<SwadhyayPost[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const activeTopic = topics.find((t) => t.id === selected) ?? null;

  // Refresh on any mutation so revokes stream in across admin sessions.
  useRealtimeRefresh({
    channel: `admin-swadhyay-mod-${selected || "none"}`,
    enabled: Boolean(selected),
    subscriptions: [
      { table: "swadhyay_posts", filter: selected ? `topic_id=eq.${selected}` : undefined },
    ],
  });

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("swadhyay_posts_for_topic", {
        p_topic_id: selected,
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        toast.error("Could not load posts.");
        setPosts([]);
        return;
      }
      setPosts((data ?? []) as SwadhyayPost[]);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // We intentionally re-fetch when `selected` changes or when the router
    // refreshes (via `useRealtimeRefresh` bumping `router`).
  }, [selected, router]);

  const revoke = (postId: string) => {
    startTransition(async () => {
      const r = await revokePostAction(postId, revokeReason);
      if (!r.ok) {
        toast.error(r.error ?? "Could not revoke post.");
        return;
      }
      setRevokingId(null);
      setRevokeReason("");
      toast.success("Post revoked.");
      // Optimistic: update local cache immediately; real refresh lands next tick.
      setPosts((prev) =>
        prev
          ? prev.map((p) =>
              p.id === postId
                ? { ...p, is_revoked: true, revoke_reason: revokeReason || null }
                : p,
            )
          : prev,
      );
    });
  };

  const restore = (postId: string) => {
    startTransition(async () => {
      const r = await restorePostAction(postId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not restore post.");
        return;
      }
      toast.success("Post restored.");
      setPosts((prev) =>
        prev
          ? prev.map((p) =>
              p.id === postId
                ? { ...p, is_revoked: false, revoke_reason: null, revoked_at: null }
                : p,
            )
          : prev,
      );
    });
  };

  if (topics.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
        No topics yet. Create a weekly topic first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topic picker */}
      <div className="flex flex-wrap items-center gap-1.5">
        {topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              t.id === selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 text-foreground/70 hover:bg-muted",
            )}
          >
            <span className="font-semibold">{t.title}</span>
            <span className="ml-2 text-foreground/50">
              {t.start_date} → {t.end_date}
            </span>
            {!t.is_published ? (
              <span className="ml-2 rounded-sm bg-muted px-1 text-[10px] uppercase tracking-wide text-foreground/60">
                draft
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading posts…</p>
      ) : !posts || posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
          No posts under {activeTopic ? `"${activeTopic.title}"` : "this topic"} yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className={cn(
                "rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm",
                post.is_revoked && "opacity-[0.92]",
              )}
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.author_avatar_url}
                  alt=""
                  className="size-8 shrink-0 rounded-full border border-border/60 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {post.author_display_name}
                  </p>
                  <p className="text-[11px] text-foreground/55">
                    {formatRelativeTime(post.created_at)} · {post.campaign_date}
                  </p>
                </div>
                {post.is_revoked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                    <ShieldAlert className="size-3" aria-hidden />
                    Revoked
                  </span>
                ) : null}
              </div>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                {post.body}
              </p>

              {post.is_revoked && post.revoke_reason ? (
                <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive/90">
                  <span className="font-semibold">Admin note:</span> {post.revoke_reason}
                </p>
              ) : null}

              {revokingId === post.id ? (
                <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                  <Textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    maxLength={500}
                    disabled={pending}
                    placeholder="Optional reason shown with the post…"
                    className="min-h-[52px] rounded-lg text-xs"
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRevokingId(null);
                        setRevokeReason("");
                      }}
                      disabled={pending}
                      className="inline-flex h-7 items-center gap-1 rounded-full px-3 text-[11px] font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => revoke(post.id)}
                      disabled={pending}
                      className="h-7 rounded-full px-3 text-[11px]"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex justify-end">
                  {post.is_revoked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restore(post.id)}
                      disabled={pending}
                      className="h-7 rounded-full px-3 text-[11px]"
                    >
                      <ShieldOff className="mr-1 size-3" aria-hidden />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRevokingId(post.id)}
                      disabled={pending}
                      className="h-7 rounded-full px-3 text-[11px]"
                    >
                      <ShieldAlert className="mr-1 size-3" aria-hidden />
                      Revoke
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
