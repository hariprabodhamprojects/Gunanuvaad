import Link from "next/link";
import { Suspense } from "react";
import { AppAuthenticatedBoundary } from "@/components/app-authenticated-boundary";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppHeaderNavSkeleton } from "@/components/app-header-nav-skeleton";
import { AppMainLoadingFallback } from "@/components/app-main-loading-fallback";
import { AppRouteWarmup } from "@/components/app-route-warmup";
import { AppShellHeaderNav } from "@/components/app-shell-header-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { NavigationPendingBar } from "@/components/navigation-pending-bar";
import { NavSelectionProvider } from "@/components/nav-selection-provider";
import { getAllowlistedUser } from "@/lib/auth/get-allowlisted-user";

export const dynamic = "force-dynamic";

async function AppShellHeader() {
  const { user, email } = await getAllowlistedUser();
  return <AppShellHeaderNav userId={user.id} email={email} />;
}

/**
 * Shell paints immediately; auth + page stream in via Suspense so taps feel instant.
 */
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavSelectionProvider>
      <NavigationPendingBar />
      <div className="bg-app-gradient flex h-[100dvh] min-h-[100dvh] w-full min-w-0 max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden">
        <header className="glass-header sticky top-0 z-40 w-full min-w-0 shrink-0 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 sm:h-14 sm:gap-3 sm:px-4 sm:py-0 lg:px-6 xl:px-8 2xl:px-10">
            <Link
              href="/home"
              className="shrink-0 font-heading text-lg font-semibold tracking-tight text-primary/85 sm:text-xl"
            >
              MananChintan
            </Link>
            <Suspense fallback={<AppHeaderNavSkeleton />}>
              <AppShellHeader />
            </Suspense>
          </div>
        </header>
        <div className="flex min-h-0 w-full flex-1">
          <AppSidebar />
          <main className="page-enter flex min-h-0 w-full min-w-0 max-w-[100vw] flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none scroll-pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] scroll-pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] px-3 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-4 lg:scroll-pb-0 lg:px-6 lg:py-7 lg:pb-8 xl:px-8 2xl:px-10">
            <Suspense fallback={<AppMainLoadingFallback />}>
              <AppAuthenticatedBoundary>{children}</AppAuthenticatedBoundary>
            </Suspense>
          </main>
        </div>
        <AppBottomNav />
        <AppRouteWarmup />
      </div>
    </NavSelectionProvider>
  );
}
