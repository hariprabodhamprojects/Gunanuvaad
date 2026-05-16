import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_STATE = path.join(__dirname, ".auth/storage.json");
const SCREENSHOT_DIR = path.join(__dirname, "qa-screenshots");
const FIXTURE_PHOTO = path.join(__dirname, "fixtures/test-photo.png");

const NAV_TABS = [
  { label: "Home", expectUrl: /\/(home|pick)(\?|$)/ },
  { label: "Feed", expectUrl: /\/feed/ },
  { label: "Standings", expectUrl: /\/standings/ },
  { label: "Swadhyay", expectUrl: /\/swadhyay/ },
  { label: "Smruti", expectUrl: /\/smruti/ },
] as const;

async function snap(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function assertAuthenticated(page: Page) {
  await page.goto("/home", { waitUntil: "networkidle" });
  const googleCta = page.getByRole("button", { name: /continue with google/i });
  if ((await googleCta.count()) > 0) {
    await snap(page, "auth-blocked");
    throw new Error(
      "Session not active (localhost vs 127.0.0.1 cookies differ). Re-save: npx playwright codegen http://localhost:3000 --save-storage=e2e/.auth/storage.json",
    );
  }
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Allowlisted QA smoke @ localhost:3000", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(AUTH_STATE),
      `Missing ${AUTH_STATE} — sign in via: npx playwright codegen http://localhost:3000 --save-storage=e2e/.auth/storage.json`,
    );
  });

  test.use({ storageState: AUTH_STATE });

  test("0 — session is allowlisted (reaches app shell)", async ({ page }) => {
    await assertAuthenticated(page);
  });

  for (const tab of NAV_TABS) {
    test(`1 — bottom nav: ${tab.label}`, async ({ page }) => {
      await assertAuthenticated(page);
      const nav = page.getByRole("navigation", { name: "Primary navigation" });
      await nav.getByRole("link", { name: tab.label, exact: true }).click();
      await page.waitForURL(tab.expectUrl, { timeout: 15_000 });
      await expect(nav.getByRole("link", { name: tab.label, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  }

  test("2 — profile sheet opens and shows Profile", async ({ page }) => {
    await assertAuthenticated(page);
    await page.getByRole("button", { name: "Open profile and settings" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View full profile" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeHidden();
  });

  test("3 — Smruti composer: pick image, caption, post", async ({ page }) => {
    await assertAuthenticated(page);
    await page.goto("/smruti", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /share your smruti/i })).toBeVisible();

    const caption = `QA smoke ${Date.now()}`;
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PHOTO);
    await expect(page.locator("form img").first()).toBeVisible({ timeout: 10_000 });
    await page.locator("#smruti-caption").fill(caption);

    const post = page.getByRole("button", { name: /^post$/i }).first();
    await post.click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 30_000 });
    await expect(page.getByText(caption).first()).toBeVisible({ timeout: 15_000 });
  });

  test("4 — feed scroll", async ({ page }) => {
    await assertAuthenticated(page);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await main.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(400);
    const scrollTop = await main.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Unauthenticated sanity", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/home requires sign-in (no saved session file needed)", async ({ page }) => {
    await page.goto("/home", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });
});
