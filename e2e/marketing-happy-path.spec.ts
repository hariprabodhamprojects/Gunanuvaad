import { expect, test } from "@playwright/test";

test("marketing page shows Google auth CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
