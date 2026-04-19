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

  return (
    <div ref={listRef} className="space-y-4">
      {/* Composer */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-2.5 shadow-sm">
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
          className="min-h-[44px] resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-foreground/45 tabular-nums">
            {newPost.length}/{POST_MAX_LEN}
          </span>
          <Button
            size="sm"
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={submit}
            disabled={pending || !canPost || !newPost.trim()}
          >
            <Send className="mr-1 size-3.5" aria-hidden />
            Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center text-sm text-muted-foreground">
          No reflections yet. Be the first to share one.
        </p>
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
