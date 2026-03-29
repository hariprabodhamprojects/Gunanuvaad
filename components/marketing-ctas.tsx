"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketingCtas() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
        Sign in with Google
      </Link>
      <Link
        href="https://nextjs.org/docs"
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
      >
        Next.js docs
      </Link>
    </div>
  );
}
