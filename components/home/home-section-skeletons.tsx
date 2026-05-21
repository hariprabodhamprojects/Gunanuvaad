import { Skeleton } from "@/components/ui/skeleton";

export function HomeSpotlightSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4" aria-busy>
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-2 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function HomeRosterSkeleton() {
  return (
    <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card/40" aria-busy>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <Skeleton className="size-12 shrink-0 rounded-full sm:size-14" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[55%]" />
            <Skeleton className="h-3 w-[35%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
