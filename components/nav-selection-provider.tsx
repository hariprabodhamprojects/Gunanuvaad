"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { appNavItems, type AppNavItem } from "@/lib/navigation/app-nav";

type NavSelectionContextValue = {
  isActive: (item: AppNavItem) => boolean;
  activeIndex: number;
  navigate: (href: string) => void;
  optimisticHref: string | null;
  isNavigating: boolean;
};

const NavSelectionContext = createContext<NavSelectionContextValue | null>(null);

export function NavSelectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (appNavItems.some((item) => item.match(pathname))) {
      setOptimisticHref(null);
    }
  }, [pathname]);

  const isActive = useCallback(
    (item: AppNavItem) => item.match(pathname) || optimisticHref === item.href,
    [pathname, optimisticHref],
  );

  const activeIndex = appNavItems.findIndex((item) => isActive(item));

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      setOptimisticHref(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [router, pathname],
  );

  const value = useMemo(
    () => ({
      isActive,
      activeIndex,
      navigate,
      optimisticHref,
      isNavigating: isPending,
    }),
    [isActive, activeIndex, navigate, optimisticHref, isPending],
  );

  return <NavSelectionContext.Provider value={value}>{children}</NavSelectionContext.Provider>;
}

export function useNavSelection() {
  const ctx = useContext(NavSelectionContext);
  if (!ctx) {
    throw new Error("useNavSelection must be used within NavSelectionProvider");
  }
  return ctx;
}
