import { NotesCalendarSection } from "@/components/notes/notes-calendar-section";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getAuthoredDailyNotes } from "@/lib/notes/get-authored-notes";

export const metadata = {
  title: "Calendar — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const notes = await getAuthoredDailyNotes();
  const campaignToday = getCampaignDateTodayISO();
  const notesKey = [...notes]
    .map((n) => `${n.id}:${n.campaign_date}`)
    .sort()
    .join("|");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Your Calendar</h1>
        <p className="text-sm text-muted-foreground">Your daily notes, by campaign day.</p>
      </header>
      <NotesCalendarSection key={notesKey} notes={notes} campaignToday={campaignToday} />
    </div>
  );
}
