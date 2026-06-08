"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SwadhyayPostCard } from "@/components/swadhyay/swadhyay-post-card";
import { postSwadhyayReflectionAction } from "@/lib/swadhyay/actions";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { REALTIME } from "@/lib/supabase/realtime-tuning";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import type { SwadhyayPost, SwadhyayTopic } from "@/lib/swadhyay/types";
import { cn } from "@/lib/utils";

type Props = {
  topic: SwadhyayTopic;
  /** Generic (non-weekly) mode — use neutral copy instead of a topic title. */
  isGeneral?: boolean;
  currentUserId: string;
  currentUserDisplayName: string;
  currentUserAvatarUrl: string;
  isOrganizer: boolean;
  canPost: boolean;
  posts: SwadhyayPost[];
};

const POST_MAX_LEN = 4000;

function buildOptimisticPost(params: {
  topicId: string;
  authorId: string;
  body: string;
  displayName: string;
  avatarUrl: string;
}): SwadhyayPost {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    topic_id: params.topicId,
    author_id: params.authorId,
    body: params.body,
    campaign_date: getCampaignDateTodayISO(),
    is_revoked: false,
    revoked_by: null,
    revoked_at: null,
    revoke_reason: null,
    created_at: now,
    updated_at: now,
    author_display_name: params.displayName,
    author_avatar_url: params.avatarUrl,
    reaction_count: 0,
    viewer_reacted: false,
    reply_count: 0,
    preview_reply: null,
  };
}

export function SwadhyayPostsFeed({
  topic,
  isGeneral = false,
  currentUserId,
  currentUserDisplayName,
  currentUserAvatarUrl,
  isOrganizer,
  canPost,
  posts,
}: Props) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const submitBusy = useRef(false);
  const [newPost, setNewPost] = useState("");
  const [localPosts, setLocalPosts] = useState(posts);

  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  useRealtimeRefresh({
    channel: `swadhyay-topic-${topic.id}`,
    subscriptions: [
      { table: "swadhyay_posts", filter: `topic_id=eq.${topic.id}` },
      { table: "swadhyay_post_replies", event: "INSERT" },
      { table: "swadhyay_post_reactions", event: "INSERT" },
      { table: "swadhyay_post_reactions", event: "DELETE" },
      { table: "swadhyay_reply_reactions", event: "INSERT" },
      { table: "swadhyay_reply_reactions", event: "DELETE" },
      { table: "swadhyay_topics", event: "UPDATE", filter: `id=eq.${topic.id}` },
    ],
    debounceMs: REALTIME.swadhyayFeed.debounceMs,
  });

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const cards = root.querySelectorAll<HTMLElement>("[data-post-card]");
    if (cards.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.24,
          ease: "power3.out",
          stagger: 0.03,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [localPosts.length]);

  const submit = () => {
    if (!canPost || submitBusy.current) return;
    const trimmed = newPost.trim();
    if (!trimmed) return;

    const optimistic = buildOptimisticPost({
      topicId: topic.id,
      authorId: currentUserId,
      body: trimmed,
      displayName: currentUserDisplayName || "You",
      avatarUrl: currentUserAvatarUrl,
    });

    submitBusy.current = true;
    setLocalPosts((prev) => [optimistic, ...prev]);
    setNewPost("");
    toast.success("Reflection posted.");

    void postSwadhyayReflectionAction(topic.id, trimmed).then((r) => {
      submitBusy.current = false;
      if (!r.ok) {
        setLocalPosts((prev) => prev.filter((p) => p.id !== optimistic.id));
        setNewPost(trimmed);
        toast.error(r.error ?? "Could not post reflection.");
        return;
      }
      router.refresh();
    });
  };

  const ringCircumference = 2 * Math.PI * 7;
  const ringPct = Math.min(1, newPost.length / POST_MAX_LEN);
  const ringOffset = ringCircumference * (1 - ringPct);
  const nearLimit = newPost.length >= POST_MAX_LEN * 0.9;
  const atLimit = newPost.length >= POST_MAX_LEN;

  return (
    <div ref={listRef} className="space-y-4">
      <div
        className={cn(
          "group relative rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm transition-all duration-[var(--motion-base)] ease-[var(--ease-out-standard)]",
          "focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
          !canPost && "opacity-70",
        )}
      >
        <Textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder={
            canPost
              ? isGeneral
                ? "Share your Swadhyay…"
                : `Share a thought on "${topic.title}"…`
              : "Posting is closed for today"
          }
          maxLength={POST_MAX_LEN}
          disabled={!canPost}
          rows={2}
          className="min-h-[46px] resize-none border-0 bg-transparent p-1 text-sm leading-6 shadow-none placeholder:text-foreground/45 focus-visible:ring-0"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-foreground/50 tabular-nums">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden
              className={cn(
                "shrink-0 -rotate-90 transition-opacity duration-[var(--motion-fast)]",
                newPost.length === 0 ? "opacity-40" : "opacity-100",
              )}
            >
              <circle cx="9" cy="9" r="7" className="stroke-border" strokeWidth="1.5" fill="none" />
              <circle
                cx="9"
                cy="9"
                r="7"
                className={cn(
                  "transition-[stroke-dashoffset,stroke] duration-[var(--motion-base)] ease-[var(--ease-out-standard)]",
                  atLimit ? "stroke-destructive" : nearLimit ? "stroke-amber-500" : "stroke-primary",
                )}
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <span
              className={cn(
                "transition-colors",
                atLimit
                  ? "font-semibold text-destructive"
                  : nearLimit
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-foreground/55",
              )}
            >
              {newPost.length}
              <span className="text-foreground/35">/{POST_MAX_LEN}</span>
            </span>
          </div>
          <Button
            size="sm"
            className="h-8 rounded-full px-4 text-[11px] font-semibold shadow-sm transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out-standard)] active:scale-[0.97] motion-reduce:active:scale-100"
            onClick={submit}
            disabled={!canPost || !newPost.trim()}
          >
            <Send className="mr-1 size-3.5" aria-hidden />
            Post
          </Button>
        </div>
      </div>

      {localPosts.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--primary) 7%, transparent), transparent 70%)",
            }}
          />
          <p className="text-sm font-medium text-foreground/75">No reflections yet.</p>
          <p className="mt-1 text-xs text-foreground/55">
            {isGeneral
              ? "Be the first to share your Swadhyay."
              : "Be the first to share a thought on this week\u2019s theme."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {localPosts.map((post) => (
            <li key={post.id}>
              <SwadhyayPostCard
                post={post}
                currentUserId={currentUserId}
                currentUserDisplayName={currentUserDisplayName}
                currentUserAvatarUrl={currentUserAvatarUrl}
                isOrganizer={isOrganizer}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
