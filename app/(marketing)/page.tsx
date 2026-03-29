import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketingCtas } from "@/components/marketing-ctas";

/**
 * `/` — landing. No auth yet (Phase 1). Link previews the logged-in shell at `/home`.
 */
export default function MarketingPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-app-gradient px-4 py-16">
      <div className="glass-card w-full max-w-lg">
        <Card className="border-0 !bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-3xl tracking-tight">Gunanuvad</CardTitle>
          <CardDescription className="text-base">
            One appreciation a day — keep the streak alive. Private notes, friendly competition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarketingCtas />
        </CardContent>
        </Card>
      </div>
      <p className="mt-8 max-w-md text-center text-sm text-muted-foreground">
        Invite-only — sign in with Google using an email on the list.
      </p>
    </div>
  );
}
