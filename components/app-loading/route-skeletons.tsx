import { Skeleton } from "@/components/ui/skeleton";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-reading animate-in fade-in duration-200" aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

export function HomeRouteSkeleton() {
  return (
    <Shell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-[min(100%,18rem)] rounded-lg" />
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-2 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card/40">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
              <Skeleton className="size-12 shrink-0 rounded-full sm:size-14" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[55%]" />
                <Skeleton className="h-3 w-[35%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function FeedRouteSkeleton() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 sm:gap-7">
        {Array.from({ length: 3 }).map((_, i) => (
          <article key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="aspect-[4/5] w-full rounded-xl sm:aspect-square" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </article>
        ))}
      </div>
    </Shell>
  );
}

export function StandingsRouteSkeleton() {
  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
        <div className="rounded-[1.75rem] border border-border/60 bg-card/50 p-3 sm:p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 sm:gap-4">
              <Skeleton className="size-9 shrink-0 rounded-full sm:size-10" />
              <Skeleton className="size-10 shrink-0 rounded-full sm:size-12" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="h-6 w-8 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function SwadhyayRouteSkeleton() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-40 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-52" />
        </div>
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function SmrutiRouteSkeleton() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Skeleton className="mx-auto h-7 w-48 rounded-lg" />
        <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:aspect-square" />
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-2 w-5 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>
    </Shell>
  );
}
