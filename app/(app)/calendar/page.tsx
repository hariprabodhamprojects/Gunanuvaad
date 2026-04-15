import { NotesCalendarSection } from "@/components/notes/notes-calendar-section";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getAuthoredDailyNotes } from "@/lib/notes/get-authored-notes";

export const metadata = {
  title: "Calendar — MananChintan",
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
    <div className="space-y-4">
      <header className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm transition-shadow duration-[200ms] ease-[var(--ease-out-standard)] hover:shadow-md">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Your Calendar</h1>
      </header>
      <NotesCalendarSection key={notesKey} notes={notes} campaignToday={campaignToday} />
    </div>
  );
}
