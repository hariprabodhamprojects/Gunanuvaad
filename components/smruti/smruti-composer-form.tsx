"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSmrutiPostAction } from "@/lib/smruti/actions";
import { compressSmrutiPhotosForUpload } from "@/lib/smruti/compress-client-photo";
import { validateAvatarFile } from "@/lib/profile/avatar";
import { SMRUTI_PHOTO_MATTE_URL } from "@/lib/smruti/public-url";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;

export function SmrutiComposerForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const appendNextPick = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => {
      for (const u of previews) URL.revokeObjectURL(u);
    };
  }, [previews]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, files.length - 1)));
  }, [files.length]);

  /** iOS PWA: `visualViewport` shrinks when the keyboard opens; sync inset so sticky controls sit above it. */
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--smruti-vv-obscured", "0px");
        return;
      }
      const obscured = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--smruti-vv-obscured", `${Math.round(obscured)}px`);
    };
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.removeProperty("--smruti-vv-obscured");
    };
  }, []);

  const scrollCaptionIntoView = () => {
    const el = captionRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
  };

  const onPick = (append: boolean) => {
    appendNextPick.current = append;
    inputRef.current?.click();
  };

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const append = appendNextPick.current;
    appendNextPick.current = false;

    if (append) {
      setFiles((prev) => {
        const next = [...prev];
        for (let i = 0; i < list.length && next.length < MAX_FILES; i++) {
          const f = list.item(i);
          if (f && f.size > 0) next.push(f);
        }
        return next;
      });
      return;
    }

    const next: File[] = [];
    for (let i = 0; i < list.length && next.length < MAX_FILES; i++) {
      const f = list.item(i);
      if (f && f.size > 0) next.push(f);
    }
    setFiles(next);
    setActiveIndex(0);
  };

  const removeAt = (i: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== i));
    setActiveIndex((prev) => {
      if (prev > i) return prev - 1;
      if (prev === i) return Math.max(0, prev - 1);
      return prev;
    });
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

      const needsOptimize = files.some((f) => f.size > 450_000 || f.type !== "image/jpeg");
      const loadingId = needsOptimize ? toast.loading("Optimizing photos for upload…") : null;
      let prepared: File[];
      try {
        prepared = await compressSmrutiPhotosForUpload(files);
      } catch (e) {
        if (loadingId) toast.dismiss(loadingId);
        toast.error(e instanceof Error ? e.message : "Could not process photos.");
        return;
      }
      if (loadingId) toast.dismiss(loadingId);

      for (const f of prepared) {
        const err = validateAvatarFile(f);
        if (err) {
          toast.error(err);
          return;
        }
      }

      const body = new FormData();
      body.set("caption", caption);
      for (const f of prepared) {
        body.append("images", f);
      }
      const res = await createSmrutiPostAction(body);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Posted to Smruti.");
      router.push("/feed");
      router.refresh();
    });
  };

  const n = files.length;
  const idx = n ? Math.min(activeIndex, n - 1) : 0;

  return (
    <form action={submit} className="relative mx-auto flex w-full max-w-lg flex-col gap-3 sm:gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Hero — Glimpses-style large rounded media; empty = tap to add. */}
      {!n ? (
        <button
          type="button"
          onClick={() => onPick(false)}
          disabled={pending}
          className={cn(
            "group relative isolate w-full overflow-hidden rounded-2xl text-left outline-none",
            "ring-1 ring-inset ring-stone-900/10",
            "min-h-[min(52vw,14rem)] cursor-pointer border-2 border-dashed border-primary/30 bg-muted/15 transition hover:border-primary/45 hover:bg-muted/25 active:scale-[0.99] disabled:opacity-60",
          )}
        >
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-scroll"
            style={{ backgroundImage: `url(${SMRUTI_PHOTO_MATTE_URL})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/[0.04] to-stone-950/[0.07]"
          />
          <div className="relative z-[2] flex min-h-[min(52vw,14rem)] flex-col items-center justify-center gap-2 px-6 py-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
              <ImagePlus className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <p className="font-heading text-sm font-semibold text-primary">Add photos</p>
            <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
              Up to {MAX_FILES} — JPEG, PNG, WebP, or GIF, 5 MB each
            </p>
          </div>
        </button>
      ) : (
        <div
          className={cn(
            "relative isolate flex w-full items-center justify-center overflow-hidden rounded-2xl",
            "ring-1 ring-inset ring-stone-900/10",
          )}
        >
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-scroll"
            style={{ backgroundImage: `url(${SMRUTI_PHOTO_MATTE_URL})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/[0.04] to-stone-950/[0.07]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={previews[idx]}
            src={previews[idx]}
            alt=""
            className="relative z-[2] mx-auto block max-h-[min(52svh,22rem)] w-full max-w-full object-contain object-center sm:max-h-[min(56svh,26rem)]"
          />
          {n > 1 ? (
            <div className="pointer-events-none absolute right-2.5 top-2.5 z-[3] sm:right-3 sm:top-3">
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-[2px]">
                {idx + 1}/{n}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {n > 1 ? (
        <div className="flex justify-center gap-1.5 px-1" role="tablist" aria-label="Selected photos">
          {files.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Photo ${i + 1} of ${n}`}
              className={cn(
                "h-2 min-w-2 rounded-full transition-all",
                i === idx ? "w-5 bg-primary" : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55",
              )}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
      ) : null}

      {n ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${f.size}-${i}`}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl ring-2 transition-shadow",
                i === idx ? "ring-primary" : "ring-transparent ring-offset-1 ring-offset-background",
              )}
            >
              <button
                type="button"
                className="relative block size-16 sm:size-[4.5rem]"
                onClick={() => setActiveIndex(i)}
                aria-label={`Show photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="size-full object-cover" />
              </button>
              <button
                type="button"
                className="absolute right-0.5 top-0.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
                aria-label={`Remove photo ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {n < MAX_FILES ? (
            <button
              type="button"
              onClick={() => onPick(true)}
              disabled={pending}
              className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-muted/10 text-primary transition hover:border-primary/45 hover:bg-muted/20 sm:size-[4.5rem]"
              aria-label="Add more photos"
            >
              <ImagePlus className="size-5 opacity-80" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {!n ? (
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onPick(false)} disabled={pending}>
          Choose from library
        </Button>
      ) : null}

      <div className="pt-1">
        <label htmlFor="smruti-caption" className="sr-only">
          Caption (required)
        </label>
        <Textarea
          ref={captionRef}
          id="smruti-caption"
          name="caption"
          required
          minLength={1}
          rows={5}
          placeholder="Write a caption…"
          disabled={pending}
          onFocus={scrollCaptionIntoView}
          className={cn(
            "min-h-[7.5rem] resize-y scroll-mt-24 rounded-xl border border-border/60 bg-card/60 px-3 py-3",
            "font-heading text-[15px] font-medium leading-relaxed text-primary",
            "placeholder:text-primary/40",
            "focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/25",
          )}
        />
      </div>

      {/* Desktop actions */}
      <div className="hidden gap-2 pb-2 lg:flex">
        <Button type="submit" disabled={pending} className="min-h-10 flex-1">
          {pending ? "Publishing…" : "Post"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => router.push("/smruti")}>
          Cancel
        </Button>
      </div>

      {/* Mobile — sticky strip in scroll flow (avoids fighting the iOS keyboard vs `position: fixed`). */}
      <div
        className={cn(
          "flex gap-2 border-t border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-md",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5",
          "sticky z-30 lg:hidden",
          "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px)+var(--smruti-vv-obscured,0px))]",
        )}
      >
        <Button
          type="button"
          variant="outline"
          className="shrink-0 touch-manipulation px-3"
          disabled={pending}
          onClick={() => router.push("/smruti")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1 touch-manipulation">
          {pending ? "Publishing…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
