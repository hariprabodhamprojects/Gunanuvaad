"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsPanel } from "@/components/settings-panel";

type Props = {
  email: string;
};

/**
 * Settings block with a light staggered entrance after the profile card.
 */
export function MeSettingsCard({ email }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 10, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.34,
          ease: "power2.out",
          delay: 0.06,
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="glass-card">
      <Card className="border-0 !bg-transparent shadow-none ring-0">
        <CardHeader className="pb-4">
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsPanel email={email} showEmail={false} />
        </CardContent>
      </Card>
    </div>
  );
}
