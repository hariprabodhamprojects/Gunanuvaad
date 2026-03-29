import { NotesCalendarSection } from "@/components/notes/notes-calendar-section";
import { getAuthoredDailyNotes } from "@/lib/notes/get-authored-notes";

export const metadata = {
  title: "Calendar — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const notes = await getAuthoredDailyNotes();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Your Calendar</h1>
      </header>
      <NotesCalendarSection notes={notes} />
    </div>
  );
}
