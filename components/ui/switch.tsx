"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitive.Root>,
  "className" | "children"
> & {
  className?: string;
  thumbClassName?: string;
};

/**
 * Toggle aligned with app tokens (Base UI Switch + Tailwind).
 */
export function Switch({ className, thumbClassName, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border/60 bg-muted transition-colors outline-none",
        "hover:bg-muted/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[checked]:border-primary/30 data-[checked]:bg-primary data-[checked]:hover:bg-primary/90",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-200 ease-out will-change-transform",
          "translate-x-0.5 data-[checked]:translate-x-[1.375rem]",
          thumbClassName,
        )}
      />
    </SwitchPrimitive.Root>
  );
}
