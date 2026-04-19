"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createWeeklyTopicAction,
  deleteWeeklyTopicAction,
  updateWeeklyTopicAction,
} from "@/lib/swadhyay/actions";
import type { SwadhyayTopic } from "@/lib/swadhyay/types";

type Props = {
  topic?: SwadhyayTopic;
  /** When true, the form shows as "Edit" and calls the update action. */
  mode: "create" | "edit";
  onDone?: () => void;
};

export function SwadhyayTopicForm({ topic, mode }: Props) {
  const action = mode === "edit" ? updateWeeklyTopicAction : createWeeklyTopicAction;
  const [published, setPublished] = useState<boolean>(topic?.is_published ?? true);

  return (
    <form action={action} className="space-y-3">
      {topic ? <input type="hidden" name="id" value={topic.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor={`title-${topic?.id ?? "new"}`}>Title</Label>
        <Input
          id={`title-${topic?.id ?? "new"}`}
          name="title"
          defaultValue={topic?.title ?? ""}
          placeholder="e.g. Vachanamrut"
          maxLength={200}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`start-${topic?.id ?? "new"}`}>Start date</Label>
          <Input
            id={`start-${topic?.id ?? "new"}`}
            name="start_date"
            type="date"
            defaultValue={topic?.start_date ?? ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`end-${topic?.id ?? "new"}`}>End date</Label>
          <Input
            id={`end-${topic?.id ?? "new"}`}
            name="end_date"
            type="date"
            defaultValue={topic?.end_date ?? ""}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`description-${topic?.id ?? "new"}`}>
          Description <span className="text-foreground/50">(optional)</span>
        </Label>
        <Textarea
          id={`description-${topic?.id ?? "new"}`}
          name="description"
          defaultValue={topic?.description ?? ""}
          placeholder="Short intro / guiding thought for the week…"
          maxLength={12_000}
          rows={4}
          className="rounded-lg"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`pub-${topic?.id ?? "new"}`}
          type="checkbox"
          name="is_published"
          value="true"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="size-4 rounded border-border"
        />
        <Label htmlFor={`pub-${topic?.id ?? "new"}`} className="text-sm">
          Published (visible to all users)
        </Label>
      </div>

      <div className="flex items-center justify-end gap-2">
        {mode === "edit" && topic ? (
          <Button
            formAction={deleteWeeklyTopicAction}
            formNoValidate
            type="submit"
            variant="destructive"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs"
          >
            Delete
          </Button>
        ) : null}
        <Button type="submit" size="sm" className="h-8 rounded-lg px-4 text-xs">
          {mode === "edit" ? "Save changes" : "Create topic"}
        </Button>
      </div>
    </form>
  );
}
