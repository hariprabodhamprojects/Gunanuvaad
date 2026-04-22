-- Enforce that a reply's `parent_reply_id` must belong to the same `post_id`.
--
-- Why: `swadhyay_post_replies` currently has two independent foreign keys:
--
--   post_id         → swadhyay_posts(id)
--   parent_reply_id → swadhyay_post_replies(id)
--
-- Nothing stops a malicious (or buggy) insert from attaching a reply under
-- post B while naming a parent that lives under post A. Such a row is
-- invisible in both threads — it never renders because the RPC
-- `swadhyay_replies_for_post(p_post_id)` filters by `post_id`, and the parent
-- thread has no child with the right post_id either. Ghost rows, subtle
-- corruption, potential audit/analytics blind spot.
--
-- The fix: promote to a composite foreign key on (parent_reply_id, post_id).
-- This is the idiomatic Postgres solution (no trigger, planner-enforced, fast).
-- Requires a companion UNIQUE on the target columns.
--
-- Safe because:
--   1. `id` is already PRIMARY KEY, so adding UNIQUE(id, post_id) is logically
--      a no-op but needed for the composite FK target.
--   2. The new FK uses MATCH SIMPLE semantics, so nullable `parent_reply_id`
--      stays unconstrained when null (top-level replies keep working).
--
-- Future phases: when we harden Swadhyay further (QA §4.2), pair this with
-- an immutability trigger on `post_id` / `author_id` so UPDATE can't do what
-- INSERT can no longer do.

begin;

-- 1) Guard: fail the migration if any existing rows already violate the rule.
--    We'd rather a noisy production migration than silently dropping orphan
--    rows. Operator decides how to reconcile before re-running.
do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count
  from public.swadhyay_post_replies child
  join public.swadhyay_post_replies parent
    on parent.id = child.parent_reply_id
  where child.parent_reply_id is not null
    and parent.post_id <> child.post_id;

  if v_bad_count > 0 then
    raise exception
      'swadhyay_post_replies: % row(s) have parent_reply_id pointing to a different post. Reconcile before running this migration.',
      v_bad_count;
  end if;
end;
$$;

-- 2) Target for the composite FK. UNIQUE(id, post_id) holds trivially because
--    id is already the primary key; the index cost is negligible and the
--    constraint is required for the FK to compile.
alter table public.swadhyay_post_replies
  add constraint swadhyay_post_replies_id_post_id_key
  unique (id, post_id);

-- 3) Composite FK. MATCH SIMPLE (the default) lets (null, post_id) pass
--    without checking — preserves the "top-level reply has no parent" case.
alter table public.swadhyay_post_replies
  add constraint swadhyay_post_replies_parent_same_post_fk
  foreign key (parent_reply_id, post_id)
  references public.swadhyay_post_replies (id, post_id)
  on delete cascade;

-- 4) Drop the now-redundant single-column FK. The composite FK above is
--    strictly more restrictive (same-post rule + same parent existence check),
--    so keeping both would just cost an extra planner validation per insert.
--    Auto-generated name follows the Postgres default `<table>_<col>_fkey`.
alter table public.swadhyay_post_replies
  drop constraint if exists swadhyay_post_replies_parent_reply_id_fkey;

commit;
