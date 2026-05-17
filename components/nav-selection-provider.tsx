"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { appNavItems, type AppNavItem } from "@/lib/navigation/app-nav";

type NavSelectionContextValue = {
  isActive: (item: AppNavItem) => boolean;
  activeIndex: number;
  navigate: (href: string) => void;
};

const NavSelectionContext = createContext<NavSelectionContextValue | null>(null);

export function NavSelectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

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
      router.push(href);
    },
    [router, pathname],
  );

  const value = useMemo(
    () => ({ isActive, activeIndex, navigate }),
    [isActive, activeIndex, navigate],
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
