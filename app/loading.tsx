import { Loader2 } from "lucide-react";

export default function GlobalLoadingSplash() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center bg-background bg-app-gradient text-foreground animate-in fade-in duration-300">
      <span className="sr-only">Loading</span>
      <div className="relative flex size-24 sm:size-32 items-center justify-center rounded-3xl border border-white/10 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          className="size-full object-contain p-2"
        />
        <Loader2
          className="pointer-events-none absolute -bottom-1 -right-1 size-8 animate-spin text-primary sm:size-9"
          aria-hidden
        />
      </div>
    </div>
  );
}
