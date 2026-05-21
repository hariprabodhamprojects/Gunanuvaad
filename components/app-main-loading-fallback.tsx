"use client";

import {
  FeedRouteSkeleton,
  HomeRouteSkeleton,
  SmrutiRouteSkeleton,
  StandingsRouteSkeleton,
  SwadhyayRouteSkeleton,
} from "@/components/app-loading/route-skeletons";
import { useNavSelection } from "@/lib/navigation/use-nav-selection";

function GenericMainSkeleton() {
  return (
    <div
      className="layout-reading animate-in fade-in duration-150"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted/60" />
      </div>
    </div>
  );
}

/** Shown the instant you tap a tab — matches the destination when possible. */
export function AppMainLoadingFallback() {
  const { optimisticHref } = useNavSelection();

  switch (optimisticHref) {
    case "/home":
    case "/pick":
      return <HomeRouteSkeleton />;
    case "/feed":
      return <FeedRouteSkeleton />;
    case "/standings":
      return <StandingsRouteSkeleton />;
    case "/swadhyay":
      return <SwadhyayRouteSkeleton />;
    case "/smruti":
      return <SmrutiRouteSkeleton />;
    default:
      return <GenericMainSkeleton />;
  }
}
