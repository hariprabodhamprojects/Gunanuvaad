import { BarChart2, BookOpenText, CalendarDays, Home, type LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const appNavItems: AppNavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: Home,
    match: (pathname) => pathname === "/home" || pathname === "/" || pathname === "/pick",
  },
  {
    href: "/standings",
    label: "Standings",
    icon: BarChart2,
    match: (pathname) => pathname === "/standings" || pathname.startsWith("/standings/"),
  },
  {
    href: "/swadhyay",
    label: "Swadhyay",
    icon: BookOpenText,
    match: (pathname) => pathname === "/swadhyay" || pathname.startsWith("/swadhyay/"),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    match: (pathname) => pathname === "/calendar" || pathname.startsWith("/calendar/"),
  },
];
