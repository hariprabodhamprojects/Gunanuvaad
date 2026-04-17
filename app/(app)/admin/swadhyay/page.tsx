import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveTodaySwadhyayTopicAction } from "@/lib/swadhyay/actions";
import { getTodaySwadhyayTopic } from "@/lib/swadhyay/queries";

export const metadata = {
  title: "Swadhyay — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSwadhyayPage() {
  const today = await getTodaySwadhyayTopic();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Swadhyay</h1>
        <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/20 p-1">
          <span className="rounded-md bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
            Today
          </span>
          <Link
            href="/swadhyay"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Past
          </Link>
        </div>
      </header>

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Publish today&apos;s topic</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={saveTodaySwadhyayTopicAction} className="space-y-3">
            <input
              name="title"
              defaultValue={today?.title ?? ""}
              placeholder="Topic title"
              required
              className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm"
            />
            <textarea
              name="body"
              defaultValue={today?.body ?? ""}
              placeholder="Write the 2-3 paragraphs for today..."
              required
              rows={8}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm"
            />
            <input
              name="scripture_ref"
              defaultValue={today?.scripture_ref ?? ""}
              placeholder="Optional reference (e.g. Vachanamrut Gadhada I-54)"
              className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm"
            />

            <div className="flex items-center gap-2">
              <input
                id="is_published"
                type="checkbox"
                name="is_published"
                value="true"
                defaultChecked={today ? today.is_published : true}
                className="size-4 rounded border-border"
              />
              <label htmlFor="is_published" className="text-sm text-foreground/90">
                Published (visible to all users)
              </label>
            </div>

            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Save topic
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
