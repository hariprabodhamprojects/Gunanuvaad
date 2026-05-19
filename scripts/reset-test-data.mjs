#!/usr/bin/env node
/**
 * Wipe test ghunos, Swadhyay, and Smruti from the Supabase project in .env.local.
 *
 * Usage (from repo root):
 *   npm run db:reset-test-data
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Settings → API → service_role — never commit)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function count(supabase, table) {
  const { count: n, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

/** List every object path under a bucket prefix (Storage API — SQL cannot delete storage). */
async function listStoragePaths(supabase, bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`storage list ${prefix || "/"}: ${error.message}`);
  const paths = [];
  for (const item of data ?? []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      paths.push(...(await listStoragePaths(supabase, bucket, full)));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

async function emptySmrutiBucket(supabase) {
  const paths = await listStoragePaths(supabase, "smruti");
  if (paths.length === 0) return 0;
  const batch = 100;
  for (let i = 0; i < paths.length; i += batch) {
    const chunk = paths.slice(i, i + batch);
    const { error } = await supabase.storage.from("smruti").remove(chunk);
    if (error) throw new Error(`storage remove: ${error.message}`);
  }
  return paths.length;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(".env.local must set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? url;

  console.log(`\nProject: ${ref}`);
  console.log("BEFORE:");
  const tables = [
    "approved_daily_notes",
    "daily_notes",
    "swadhyay_reply_reactions",
    "swadhyay_post_reactions",
    "swadhyay_post_replies",
    "swadhyay_posts",
    "swadhyay_topics",
    "smruti_posts",
  ];
  for (const t of tables) {
    console.log(`  ${t}: ${await count(supabase, t)}`);
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("reset_launch_test_data");
  if (rpcErr) {
    console.error("\nRPC reset_launch_test_data failed:", rpcErr.message);
    console.error(
      "Run supabase/migrations/20260519130000_reset_launch_test_data_rpc.sql in SQL Editor once,\n" +
        "or run supabase/scripts/verify-and-reset-test-data.sql manually.",
    );
    process.exit(1);
  }
  console.log("\nDB reset:", JSON.stringify(rpcData, null, 2));

  try {
    const removed = await emptySmrutiBucket(supabase);
    console.log(`Smruti storage files removed: ${removed}`);
  } catch (e) {
    console.warn("Smruti storage cleanup skipped:", e.message);
  }

  console.log("\nAFTER:");
  for (const t of tables) {
    console.log(`  ${t}: ${await count(supabase, t)}`);
  }
  console.log("\nDone. Hard-refresh the app (or restart npm run dev).\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
