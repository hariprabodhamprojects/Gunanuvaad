import {
  BarChart2,
  BookOpenText,
  Home,
  Images,
  SquareStack,
  type LucideIcon,
} from "lucide-react";

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
    href: "/feed",
    label: "Feed",
    icon: SquareStack,
    match: (pathname) => pathname === "/feed" || pathname.startsWith("/feed/"),
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
    href: "/smruti",
    label: "Smruti",
    icon: Images,
    match: (pathname) => pathname === "/smruti" || pathname.startsWith("/smruti/"),
  },
];
