"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSwadhyayCommentAction,
  editSwadhyayCommentAction,
  postSwadhyayCommentAction,
} from "@/lib/swadhyay/actions";
import type { SwadhyayComment } from "@/lib/swadhyay/types";

type Props = {
  topicId: string;
  currentUserId: string;
  comments: SwadhyayComment[];
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function canEditOrDeleteComment(comment: SwadhyayComment, currentUserId: string) {
  if (comment.author_id !== currentUserId) return false;
  const created = new Date(comment.created_at).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= EDIT_WINDOW_MS;
}

export function SwadhyayComments({ topicId, currentUserId, comments }: Props) {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => comments, [comments]);

  const submitNew = () => {
    startTransition(async () => {
      const r = await postSwadhyayCommentAction(topicId, newComment);
      if (!r.ok) {
        toast.error(r.error ?? "Could not post comment.");
        return;
      }
      setNewComment("");
      toast.success("Comment posted.");
      router.refresh();
    });
  };

  const startEdit = (comment: SwadhyayComment) => {
    setEditingId(comment.id);
    setEditingBody(comment.body);
  };

  const saveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      const r = await editSwadhyayCommentAction(editingId, editingBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not save edit.");
        return;
      }
      setEditingId(null);
      setEditingBody("");
      toast.success("Comment updated.");
      router.refresh();
    });
  };

  const removeComment = (commentId: string) => {
    startTransition(async () => {
      const r = await deleteSwadhyayCommentAction(commentId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete comment.");
        return;
      }
      toast.success("Comment deleted.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your reflection..."
          maxLength={2000}
          disabled={pending}
          className="min-h-[110px] resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{newComment.length}/2000</p>
          <Button onClick={submitNew} disabled={pending || !newComment.trim()}>
            Post comment
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to share.
          </p>
        ) : null}

        {rows.map((comment) => {
          const canEdit = canEditOrDeleteComment(comment, currentUserId);
          const isEditing = editingId === comment.id;
          return (
            <article key={comment.id} className="rounded-xl border border-border/60 bg-card/30 p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.author_avatar_url}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{comment.author_display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    maxLength={2000}
                    disabled={pending}
                    className="min-h-[90px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditingBody("");
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveEdit} disabled={pending || !editingBody.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
                  {canEdit ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(comment)} disabled={pending}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeComment(comment.id)} disabled={pending}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
