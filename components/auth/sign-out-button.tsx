"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("shrink-0 whitespace-nowrap", className)}
      onClick={signOut}
    >
      Sign out
    </Button>
  );
}
