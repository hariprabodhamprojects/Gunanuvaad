import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown when the user is allowlisted but `allowed_emails.display_name` is empty for their email.
 */
export function OnboardingMissingName() {
  return (
    <div className="glass-card w-full max-w-md">
      <Card className="border-0 !bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">Name not on the list yet</CardTitle>
          <CardDescription className="text-pretty">
            Your organizer can add your name next to your email in the invite list. After
            it&apos;s saved, refresh this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          If you just signed in, wait a moment and try refreshing.
        </CardContent>
      </Card>
    </div>
  );
}
