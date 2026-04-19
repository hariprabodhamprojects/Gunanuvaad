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
      <div className="layout-reading">
        <header className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm transition-shadow duration-[var(--motion-base)] ease-[var(--ease-out-standard)] hover:shadow-md sm:px-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Calendar
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
            Your Calendar
          </h1>
        </header>
      </div>
      <div className="layout-hybrid">
        <NotesCalendarSection key={notesKey} notes={notes} campaignToday={campaignToday} />
      </div>
    </div>
  );
}
