#!/usr/bin/env node
/**
 * Generate a fresh VAPID keypair for Web Push.
 *
 * Usage (from repo root):
 *   node scripts/generate-vapid-keys.mjs
 *
 * Paste the two lines it prints into .env.local AND your Vercel project envs.
 * Generate ONCE per environment — rotating keys invalidates every existing
 * push_subscriptions row, so subscribers must re-subscribe.
 */

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("");
console.log("# Copy these into .env.local and Vercel project settings:");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("");
console.log("# Then set a long random value for the cron auth, e.g.:");
console.log("#   openssl rand -hex 32");
console.log("CRON_SECRET=<paste-32-random-hex-bytes>");
console.log("");
console.log("# And the email shown in the VAPID 'sub' claim (your contact):");
console.log("VAPID_CONTACT_EMAIL=you@example.com");
console.log("");
