"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSmrutiPostAction } from "@/lib/smruti/actions";
import { validateAvatarFile } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;

export function SmrutiComposerForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => {
      for (const u of previews) URL.revokeObjectURL(u);
    };
  }, [previews]);

  const onPick = () => inputRef.current?.click();

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: File[] = [];
    for (let i = 0; i < list.length && next.length < MAX_FILES; i++) {
      const f = list.item(i);
      if (f && f.size > 0) next.push(f);
    }
    setFiles(next);
  };

  const submit = (fd: FormData) => {
    startTransition(async () => {
      const caption = String(fd.get("caption") ?? "").trim();
      if (!caption) {
        toast.error("Add a caption.");
        return;
      }
      if (files.length < 1 || files.length > MAX_FILES) {
        toast.error(`Choose between 1 and ${MAX_FILES} photos.`);
        return;
      }
      for (const f of files) {
        const err = validateAvatarFile(f);
        if (err) {
          toast.error(err);
          return;
        }
      }
      const body = new FormData();
      body.set("caption", caption);
      for (const f of files) {
        body.append("images", f);
      }
      const res = await createSmrutiPostAction(body);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Posted to Smruti.");
      router.push("/smruti");
      router.refresh();
    });
  };

  return (
    <form action={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Photos</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={onPick} disabled={pending}>
            Choose up to {MAX_FILES} images
          </Button>
          <span className="text-xs text-muted-foreground">
            {files.length ? `${files.length} selected` : "JPEG, PNG, WebP, or GIF — 5 MB each max."}
          </span>
        </div>
        {files.length ? (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <label htmlFor="smruti-caption" className="mb-1.5 block text-sm font-medium text-foreground">
          Caption <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="smruti-caption"
          name="caption"
          required
          minLength={1}
          rows={4}
          placeholder="What is this moment about?"
          className={cn("resize-y min-h-[100px]")}
          disabled={pending}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="min-w-[8rem]">
          {pending ? "Publishing…" : "Publish"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => router.push("/smruti")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
