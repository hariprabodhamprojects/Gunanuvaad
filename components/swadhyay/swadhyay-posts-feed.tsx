"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SwadhyayPostCard } from "@/components/swadhyay/swadhyay-post-card";
import { postSwadhyayReflectionAction } from "@/lib/swadhyay/actions";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import type { SwadhyayPost, SwadhyayTopic } from "@/lib/swadhyay/types";
import { cn } from "@/lib/utils";

type Props = {
  topic: SwadhyayTopic;
  currentUserId: string;
  isOrganizer: boolean;
  canPost: boolean;
  posts: SwadhyayPost[];
};

const POST_MAX_LEN = 4000;

export function SwadhyayPostsFeed({
  topic,
  currentUserId,
  isOrganizer,
  canPost,
  posts,
}: Props) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [newPost, setNewPost] = useState("");
  const [pending, startTransition] = useTransition();

  // Live-update on any post / reply / reaction change in this topic. Reactions
  // don't carry the topic_id in their row shape, so the reply_reactions and
  // post_reactions listeners are unfiltered — volume is low in practice and the
  // server fetch decides what matters.
  useRealtimeRefresh({
    channel: `swadhyay-topic-${topic.id}`,
    subscriptions: [
      { table: "swadhyay_posts", filter: `topic_id=eq.${topic.id}` },
      { table: "swadhyay_post_replies" },
      { table: "swadhyay_post_reactions" },
      { table: "swadhyay_reply_reactions" },
      { table: "swadhyay_topics", event: "UPDATE", filter: `id=eq.${topic.id}` },
    ],
  });

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set("[data-post-card]", { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-post-card]",
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
  }, [posts.length]);

  const submit = () => {
    if (!canPost) return;
    startTransition(async () => {
      const r = await postSwadhyayReflectionAction(topic.id, newPost);
      if (!r.ok) {
        toast.error(r.error ?? "Could not post reflection.");
        return;
      }
      setNewPost("");
      toast.success("Reflection posted.");
      router.refresh();
    });
  };

  // Char-count ring — visualises fill toward POST_MAX_LEN. Full circumference
  // circle trick: we animate strokeDashoffset. C ≈ 2 * π * r (r = 7) ≈ 44.
  const ringCircumference = 2 * Math.PI * 7;
  const ringPct = Math.min(1, newPost.length / POST_MAX_LEN);
  const ringOffset = ringCircumference * (1 - ringPct);
  const nearLimit = newPost.length >= POST_MAX_LEN * 0.9;
  const atLimit = newPost.length >= POST_MAX_LEN;

  return (
    <div ref={listRef} className="space-y-4">
      {/* Composer — a warmer surface with a focus glow and a live char-count ring. */}
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
              ? `Share a thought on "${topic.title}"…`
              : "Posting is closed for today"
          }
          maxLength={POST_MAX_LEN}
          disabled={pending || !canPost}
          rows={2}
          className="min-h-[46px] resize-none border-0 bg-transparent p-1 text-sm leading-6 shadow-none placeholder:text-foreground/45 focus-visible:ring-0"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-foreground/50 tabular-nums">
            {/* Char count ring */}
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
              <circle
                cx="9"
                cy="9"
                r="7"
                className="stroke-border"
                strokeWidth="1.5"
                fill="none"
              />
              <circle
                cx="9"
                cy="9"
                r="7"
                className={cn(
                  "transition-[stroke-dashoffset,stroke] duration-[var(--motion-base)] ease-[var(--ease-out-standard)]",
                  atLimit
                    ? "stroke-destructive"
                    : nearLimit
                      ? "stroke-amber-500"
                      : "stroke-primary",
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
            disabled={pending || !canPost || !newPost.trim()}
          >
            <Send className="mr-1 size-3.5" aria-hidden />
            Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--primary) 7%, transparent), transparent 70%)",
            }}
          />
          <p className="text-sm font-medium text-foreground/75">
            No reflections yet.
          </p>
          <p className="mt-1 text-xs text-foreground/55">
            Be the first to share a thought on this week&apos;s theme.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <SwadhyayPostCard
                post={post}
                currentUserId={currentUserId}
                isOrganizer={isOrganizer}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
