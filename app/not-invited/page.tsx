import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Not invited — Gunanuvad",
};

/**
 * Shown when someone signs in with an email that is not on `allowed_emails`.
 * Session has already been cleared in `requireAllowlistedUser`.
 */
export default function NotInvitedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-app-gradient px-4 py-16">
      <div className="glass-card w-full max-w-md">
        <Card className="border-0 !bg-transparent shadow-none ring-0">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl tracking-tight">Not on the invite list</CardTitle>
            <CardDescription>
              The Google account you used isn&apos;t on the invite list for this group. If you think
              that&apos;s a mistake, contact the organizers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link
              href="/"
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
