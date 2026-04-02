"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  text: string;
};

export function GhunosCopyBox({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        readOnly
        value={text}
        className="min-h-[16rem] w-full resize-y rounded-xl border border-border/70 bg-muted/15 p-3 text-sm leading-relaxed"
      />
      <Button type="button" variant="secondary" onClick={onCopy}>
        {copied ? "Copied" : "Copy text"}
      </Button>
    </div>
  );
}
