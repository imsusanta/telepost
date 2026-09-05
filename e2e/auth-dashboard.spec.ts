import { expect, test } from "@playwright/test";
import { E2E_USER_NAME, mockSupabaseSession } from "./helpers/mockSupabase";

test.describe("authenticated dashboard", () => {
  test("mocked session renders dashboard chrome without Telegram or Razorpay", async ({ page }) => {
    await mockSupabaseSession(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: new RegExp(E2E_USER_NAME.split(" ")[0]) })).toBeVisible();
    await expect(page.getByText("Total Quizzes")).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh stats/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create quiz/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^dashboard$/i }).first()).toBeVisible();
  });

  test("mocked session can open settings without live payment providers", async ({ page }) => {
    await mockSupabaseSession(page);
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByText("Profile Information")).toBeVisible();
  });
});

test.describe("unauthenticated app shell", () => {
  test("protected dashboard routes redirect to auth", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/settings", "/dashboard/channels", "/dashboard/create-quiz"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth/);
    }
    await expect(page.getByRole("button", { name: /sign in to dashboard/i })).toBeVisible();
  });
});
