"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ComponentProps, type MouseEvent } from "react";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { useNavSelection } from "@/lib/navigation/use-nav-selection";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  item: AppNavItem;
  activeClassName?: string;
  inactiveClassName?: string;
};

/** Nav link with optimistic active state — highlight moves on tap while the route skeleton shows. */
export const AppNavLink = forwardRef<HTMLAnchorElement, Props>(function AppNavLink(
  { item, className, activeClassName, inactiveClassName, children, ...rest },
  ref,
) {
  const { isActive, navigate } = useNavSelection();
  const router = useRouter();
  const active = isActive(item);

  const prefetchRoute = () => {
    if (!active) router.prefetch(item.href);
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0 ||
      active
    ) {
      return;
    }
    e.preventDefault();
    navigate(item.href);
  };

  return (
    <Link
      ref={ref}
      href={item.href}
      prefetch
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(className, active ? activeClassName : inactiveClassName)}
      onPointerDown={prefetchRoute}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Link>
  );
});
