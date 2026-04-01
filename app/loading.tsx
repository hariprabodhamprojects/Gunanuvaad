import { Loader2 } from "lucide-react";

export default function GlobalLoadingSplash() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center bg-background bg-app-gradient text-foreground animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center animate-pulse gap-6">
        {/* Placeholder for actual Logo (Using an explicit img tag for /logo.png as requested) */}
        <div className="relative flex size-24 sm:size-32 items-center justify-center rounded-3xl bg-card border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden transition-transform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Gunanuvad Logo"
            className="size-full object-contain"
            // Fallback gracefully if logo is missing
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-logo');
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            .fallback-logo::after {
              content: "G";
              font-size: 3rem;
              font-family: inherit;
              font-weight: 800;
              color: hsl(var(--primary));
            }
          `}} />
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-md">
          Gunanuvad
        </h1>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary opacity-80" aria-hidden />
          <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
            Loading your dashboard
            <span className="inline-flex w-4 text-left">
              <span className="animate-[loading-dots_1.5s_infinite] inline-block">.</span>
              <span className="animate-[loading-dots_1.5s_0.2s_infinite] inline-block">.</span>
              <span className="animate-[loading-dots_1.5s_0.4s_infinite] inline-block">.</span>
            </span>
          </p>
        </div>

        {/* Global Keyframes for the customized loading dots */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes loading-dots {
            0%, 20% { opacity: 0; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-2px); }
            80%, 100% { opacity: 0; transform: translateY(0); }
          }
        `}} />
      </div>
    </div>
  );
}
