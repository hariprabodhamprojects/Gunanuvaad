"use client";

import { useNavSelection } from "@/lib/navigation/use-nav-selection";
import { cn } from "@/lib/utils";

/** Thin top indicator while the next RSC payload is loading. */
export function NavigationPendingBar() {
  const { isNavigating } = useNavSelection();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isNavigating}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 origin-left bg-primary transition-transform duration-200 ease-out",
        isNavigating ? "scale-x-[0.35] opacity-100" : "scale-x-0 opacity-0",
      )}
    />
  );
}
