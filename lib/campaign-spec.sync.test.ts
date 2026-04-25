import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_BODY_MAX_LEN, NOTE_BODY_MIN_LEN } from "./campaign-spec";

/**
 * Guards against drift between TS (`lib/campaign-spec.ts`) and the latest
 * `submit_daily_note` migration. When you change min/max, update both places
 * and extend this test if a newer migration supersedes the file below.
 */
describe("campaign-spec vs submit_daily_note SQL", () => {
  it("NOTE_BODY_* matches 20260419120000_daily_note_min_30.sql", () => {
    const sql = readFileSync(
      join(__dirname, "../supabase/migrations/20260419120000_daily_note_min_30.sql"),
      "utf8",
    );
    expect(sql).toContain(`char_length(v_body) < ${NOTE_BODY_MIN_LEN}`);
    expect(sql).toContain(`char_length(v_body) > ${NOTE_BODY_MAX_LEN}`);
  });

  it("NOTE_BODY_* matches daily_notes_body_len CHECK migration", () => {
    const sql = readFileSync(
      join(__dirname, "../supabase/migrations/20260424120000_daily_notes_body_check_min_30.sql"),
      "utf8",
    );
    expect(sql).toContain(`char_length(body) >= ${NOTE_BODY_MIN_LEN}`);
    expect(sql).toContain(`char_length(body) <= ${NOTE_BODY_MAX_LEN}`);
  });
});
