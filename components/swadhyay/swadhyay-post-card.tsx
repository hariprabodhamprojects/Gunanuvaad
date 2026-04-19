"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Pencil,
  Send,
  ShieldAlert,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePostAction,
  deleteReplyAction,
  editPostAction,
  editReplyAction,
  replyToPostAction,
  restorePostAction,
  revokePostAction,
  togglePostReactionAction,
  toggleReplyReactionAction,
} from "@/lib/swadhyay/actions";
import { createClient } from "@/lib/supabase/client";
import type { SwadhyayPost, SwadhyayReply } from "@/lib/swadhyay/types";
import { cn } from "@/lib/utils";

type Props = {
  post: SwadhyayPost;
  currentUserId: string;
  isOrganizer: boolean;
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function canEditOrDelete(
  authorId: string,
  createdAt: string,
  currentUserId: string,
): boolean {
  if (authorId !== currentUserId) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= EDIT_WINDOW_MS;
}

function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function HeartButton({
  reacted,
  count,
  disabled,
  onClick,
  size = "md",
}: {
  reacted: boolean;
  count: number;
  disabled: boolean;
  onClick: () => void;
  size?: "md" | "sm";
}) {
  const iconSize = size === "sm" ? "size-[14px]" : "size-[18px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={reacted ? "Remove like" : "Like"}
      aria-pressed={reacted}
      className={cn(
        "group flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-xs font-semibold tabular-nums transition-transform active:scale-90 disabled:opacity-40 motion-reduce:active:scale-100",
        reacted ? "text-primary" : "text-foreground/55 hover:text-foreground",
      )}
    >
      <Heart
        className={cn(iconSize, "transition-transform", reacted && "scale-110")}
        strokeWidth={reacted ? 0 : 2}
        fill={reacted ? "currentColor" : "none"}
        aria-hidden
      />
      {count > 0 ? <span>{count}</span> : null}
    </button>
  );
}

function MetaButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "neutral" | "danger" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-40",
        tone === "danger"
          ? "text-foreground/55 hover:text-destructive"
          : tone === "accent"
            ? "text-primary hover:text-primary/80"
            : "text-foreground/55 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Compact round icon button for action rows (reply / edit / delete). */
function IconButton({
  icon,
  label,
  disabled,
  onClick,
  tone,
  size = "md",
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "neutral" | "danger";
  size?: "md" | "sm";
}) {
  const dims = size === "sm" ? "size-6" : "size-7";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
        dims,
        tone === "danger"
          ? "text-foreground/55 hover:bg-destructive/10 hover:text-destructive"
          : "text-foreground/55 hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

export function SwadhyayPostCard({ post, currentUserId, isOrganizer }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Post edit state
  const [editingPost, setEditingPost] = useState(false);
  const [editBody, setEditBody] = useState(post.body);

  // Replies
  const [replies, setReplies] = useState<SwadhyayReply[] | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Reply composer (at post level and per-reply)
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyBody, setEditingReplyBody] = useState("");

  // Revoke dialog state
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  const canEditPost = canEditOrDelete(post.author_id, post.created_at, currentUserId);

  const loadAllReplies = useCallback(async () => {
    setRepliesLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("swadhyay_replies_for_post", {
      p_post_id: post.id,
    });
    setRepliesLoading(false);
    if (error) {
      toast.error("Could not load replies.");
      return;
    }
    setReplies((data ?? []) as SwadhyayReply[]);
  }, [post.id]);

  const onExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && replies === null) void loadAllReplies();
  };

  // When a reply mutation happens we need fresh data from the server. Rather
  // than refetching eagerly we just invalidate the local cache and let the
  // router.refresh() surface the updated preview + reply_count; if the thread
  // is currently expanded we also reload the full list.
  const afterReplyMutation = () => {
    router.refresh();
    if (expanded) void loadAllReplies();
  };

  // ── Post actions ────────────────────────────────────────────────────────

  const togglePostReaction = () => {
    startTransition(async () => {
      const r = await togglePostReactionAction(post.id);
      if (!r.ok) {
        toast.error(r.error ?? "Could not update reaction.");
        return;
      }
      router.refresh();
    });
  };

  const savePostEdit = () => {
    startTransition(async () => {
      const r = await editPostAction(post.id, editBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not save changes.");
        return;
      }
      setEditingPost(false);
      toast.success("Reflection updated.");
      router.refresh();
    });
  };

  const removePost = () => {
    startTransition(async () => {
      const r = await deletePostAction(post.id);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete reflection.");
        return;
      }
      toast.success("Reflection deleted.");
      router.refresh();
    });
  };

  const revoke = () => {
    startTransition(async () => {
      const r = await revokePostAction(post.id, revokeReason);
      if (!r.ok) {
        toast.error(r.error ?? "Could not revoke post.");
        return;
      }
      setRevokeOpen(false);
      setRevokeReason("");
      toast.success("Post revoked.");
      router.refresh();
    });
  };

  const restore = () => {
    startTransition(async () => {
      const r = await restorePostAction(post.id);
      if (!r.ok) {
        toast.error(r.error ?? "Could not restore post.");
        return;
      }
      toast.success("Post restored.");
      router.refresh();
    });
  };

  // ── Reply actions ───────────────────────────────────────────────────────

  const openReplyToPost = () => {
    setReplyParentId(null);
    setReplyOpen(true);
    setReplyBody("");
  };

  const openReplyToReply = (reply: SwadhyayReply) => {
    setReplyParentId(reply.id);
    setReplyOpen(true);
    setReplyBody("");
    // Auto-expand the thread so the user sees what they are replying to.
    if (!expanded) setExpanded(true);
    if (replies === null) void loadAllReplies();
  };

  const submitReply = () => {
    startTransition(async () => {
      const r = await replyToPostAction(post.id, replyParentId, replyBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not post reply.");
        return;
      }
      setReplyOpen(false);
      setReplyBody("");
      setReplyParentId(null);
      setExpanded(true);
      toast.success("Reply posted.");
      afterReplyMutation();
    });
  };

  const saveReplyEdit = () => {
    if (!editingReplyId) return;
    startTransition(async () => {
      const r = await editReplyAction(editingReplyId, editingReplyBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not save changes.");
        return;
      }
      setEditingReplyId(null);
      setEditingReplyBody("");
      toast.success("Reply updated.");
      afterReplyMutation();
    });
  };

  const removeReply = (replyId: string) => {
    startTransition(async () => {
      const r = await deleteReplyAction(replyId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete reply.");
        return;
      }
      toast.success("Reply deleted.");
      afterReplyMutation();
    });
  };

  const toggleReplyReaction = (replyId: string) => {
    startTransition(async () => {
      const r = await toggleReplyReactionAction(replyId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not update reaction.");
        return;
      }
      afterReplyMutation();
    });
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  const visibleReplies = useMemo(() => replies ?? [], [replies]);
  const hasOverflow = post.reply_count > 1;

  const renderReply = (reply: SwadhyayReply) => {
    const canEdit = canEditOrDelete(reply.author_id, reply.created_at, currentUserId);
    const isEditingThisReply = editingReplyId === reply.id;
    return (
      <div className="flex items-start gap-2.5" data-reply-row>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={reply.author_avatar_url}
          alt=""
          className="size-7 shrink-0 rounded-full border border-border/60 object-cover"
        />
        <div className="min-w-0 flex-1">
          {isEditingThisReply ? (
            <div className="mt-0.5 space-y-1.5">
              <Textarea
                value={editingReplyBody}
                onChange={(e) => setEditingReplyBody(e.target.value)}
                maxLength={2000}
                disabled={pending}
                className="min-h-[58px] rounded-lg text-sm"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReplyId(null);
                    setEditingReplyBody("");
                  }}
                  disabled={pending}
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
                >
                  <X className="size-3.5" aria-hidden />
                  Cancel
                </button>
                <Button
                  size="sm"
                  onClick={saveReplyEdit}
                  disabled={pending || !editingReplyBody.trim()}
                  className="h-7 rounded-full px-3 text-[11px]"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground">
              <span className="mr-1.5 font-semibold">{reply.author_display_name}</span>
              <span>{reply.body}</span>
            </p>
          )}
          {!isEditingThisReply ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-foreground/50">
                {formatRelativeTime(reply.created_at)}
              </span>
              {reply.reaction_count > 0 ? (
                <span className="text-[11px] font-semibold text-foreground/65">
                  {reply.reaction_count} {reply.reaction_count === 1 ? "like" : "likes"}
                </span>
              ) : null}
              {reply.author_id !== currentUserId ? (
                <IconButton
                  icon={<MessageCircle className="size-[13px]" aria-hidden />}
                  label="Reply"
                  size="sm"
                  disabled={pending}
                  onClick={() => openReplyToReply(reply)}
                />
              ) : null}
              {canEdit ? (
                <>
                  <IconButton
                    icon={<Pencil className="size-[12px]" aria-hidden />}
                    label="Edit"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setEditingReplyId(reply.id);
                      setEditingReplyBody(reply.body);
                    }}
                  />
                  <IconButton
                    icon={<Trash2 className="size-[12px]" aria-hidden />}
                    label="Delete"
                    size="sm"
                    tone="danger"
                    disabled={pending}
                    onClick={() => removeReply(reply.id)}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        {!isEditingThisReply ? (
          <HeartButton
            reacted={reply.viewer_reacted}
            count={reply.reaction_count}
            disabled={pending}
            onClick={() => toggleReplyReaction(reply.id)}
            size="sm"
          />
        ) : null}
      </div>
    );
  };

  return (
    <article
      data-post-card
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition-shadow duration-[200ms] ease-[var(--ease-out-standard)] hover:shadow-md",
        post.is_revoked && "opacity-[0.92]",
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.author_avatar_url}
          alt=""
          className="size-10 shrink-0 rounded-full border border-border/60 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {post.author_display_name}
          </p>
          <p className="text-[11px] text-foreground/55">
            {formatRelativeTime(post.created_at)}
            {post.created_at !== post.updated_at ? (
              <span className="ml-1 italic text-foreground/45">(edited)</span>
            ) : null}
          </p>
        </div>
        {post.is_revoked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            <ShieldAlert className="size-3" aria-hidden />
            Revoked
          </span>
        ) : null}
      </header>

      {/* Body */}
      <div className="mt-3">
        {editingPost ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              maxLength={4000}
              disabled={pending}
              className="min-h-[120px] rounded-lg"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingPost(false);
                  setEditBody(post.body);
                }}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
              >
                <X className="size-3.5" aria-hidden />
                Cancel
              </button>
              <Button
                size="sm"
                onClick={savePostEdit}
                disabled={pending || !editBody.trim()}
                className="h-8 rounded-full px-4 text-xs"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            {post.body}
          </p>
        )}
        {post.is_revoked && post.revoke_reason ? (
          <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive/90">
            <span className="font-semibold">Admin note:</span> {post.revoke_reason}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      {!editingPost ? (
        <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-2">
          <HeartButton
            reacted={post.viewer_reacted}
            count={post.reaction_count}
            disabled={pending}
            onClick={togglePostReaction}
          />
          {/* Only render Reply for other people's posts — you don't reply to yourself. */}
          {post.author_id !== currentUserId ? (
            <IconButton
              icon={<MessageCircle className="size-[15px]" aria-hidden />}
              label="Reply"
              disabled={pending}
              onClick={openReplyToPost}
            />
          ) : null}
          {canEditPost ? (
            <>
              <IconButton
                icon={<Pencil className="size-[14px]" aria-hidden />}
                label="Edit"
                disabled={pending}
                onClick={() => {
                  setEditingPost(true);
                  setEditBody(post.body);
                }}
              />
              <IconButton
                icon={<Trash2 className="size-[14px]" aria-hidden />}
                label="Delete"
                tone="danger"
                disabled={pending}
                onClick={removePost}
              />
            </>
          ) : null}
          {isOrganizer ? (
            <div className="ml-auto">
              {post.is_revoked ? (
                <MetaButton tone="accent" disabled={pending} onClick={restore}>
                  <span className="inline-flex items-center gap-1">
                    <ShieldOff className="size-3" aria-hidden />
                    Restore
                  </span>
                </MetaButton>
              ) : (
                <MetaButton
                  tone="danger"
                  disabled={pending}
                  onClick={() => setRevokeOpen((v) => !v)}
                >
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="size-3" aria-hidden />
                    Revoke
                  </span>
                </MetaButton>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Revoke inline panel */}
      {revokeOpen ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive/90">
            Revoke removes the point for this author&apos;s day. The post stays visible.
          </p>
          <Textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            maxLength={500}
            disabled={pending}
            placeholder="Optional reason (shown with the post)…"
            className="mt-2 min-h-[52px] rounded-lg text-xs"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRevokeOpen(false);
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
              onClick={revoke}
              disabled={pending}
              className="h-7 rounded-full px-3 text-[11px]"
            >
              Revoke
            </Button>
          </div>
        </div>
      ) : null}

      {/* Reply composer */}
      {replyOpen ? (
        <div className="mt-3 rounded-lg border border-border/50 bg-muted/25 p-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            maxLength={2000}
            disabled={pending}
            placeholder={
              replyParentId
                ? "Reply to this comment…"
                : `Reply to ${post.author_display_name}…`
            }
            autoFocus
            className="min-h-[52px] resize-none border-0 bg-transparent p-1 text-[13.5px] shadow-none focus-visible:ring-0 sm:text-sm"
          />
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setReplyOpen(false);
                setReplyBody("");
                setReplyParentId(null);
              }}
              disabled={pending}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
            >
              Cancel
            </button>
            <Button
              size="sm"
              disabled={pending || !replyBody.trim()}
              onClick={submitReply}
              className="h-7 rounded-full px-3 text-[11px]"
            >
              <Send className="mr-1 size-3.5" aria-hidden />
              Send
            </Button>
          </div>
        </div>
      ) : null}

      {/* Replies — Instagram-style collapse */}
      {post.reply_count > 0 ? (
        <div className="mt-3 ml-3 border-l-2 border-border/40 pl-3">
          {!expanded && post.preview_reply ? renderReply(post.preview_reply) : null}

          {!expanded && hasOverflow ? (
            <button
              type="button"
              onClick={onExpand}
              disabled={pending || repliesLoading}
              className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-foreground/55 transition-colors hover:text-foreground disabled:opacity-50"
            >
              <span className="inline-block h-px w-6 bg-border" aria-hidden />
              {repliesLoading
                ? "Loading…"
                : `View ${post.reply_count - 1} more ${
                    post.reply_count - 1 === 1 ? "reply" : "replies"
                  }`}
            </button>
          ) : null}

          {expanded ? (
            <>
              {replies === null ? (
                <p className="text-[11px] text-foreground/50">Loading replies…</p>
              ) : visibleReplies.length === 0 ? (
                <p className="text-[11px] text-foreground/50">No replies.</p>
              ) : (
                <ul className="space-y-3">
                  {visibleReplies.map((reply) => (
                    <li key={reply.id}>{renderReply(reply)}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-foreground/55 transition-colors hover:text-foreground"
              >
                <span className="inline-block h-px w-6 bg-border" aria-hidden />
                Hide replies
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
