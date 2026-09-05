import { expect, test } from "@playwright/test";

test.describe("public marketing pages", () => {
  test("landing FAQ states 7-day trial, no SOC 2, and not telepost.me", async ({ page }) => {
    await page.goto("/");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: /frequently asked/i })).toBeVisible();

    await page.getByRole("button", { name: "Is my data secure?" }).click();
    await expect(page.getByText("We are not SOC 2 certified.")).toBeVisible();

    await page.getByRole("button", { name: "What's included in the free trial?" }).click();
    await expect(page.getByText("New accounts get a 7-day trial")).toBeVisible();

    await page.getByRole("button", { name: "Are you the same as telepost.me?" }).click();
    await expect(page.getByText("We are not affiliated with telepost.me")).toBeVisible();
  });

  test("install page describes HTTPS and row-level security", async ({ page }) => {
    await page.goto("/install");
    await expect(page.getByText("HTTPS in transit and row-level security")).toBeVisible();
    await expect(page.getByText("Enterprise-grade security")).toHaveCount(0);
  });

  test("data security page does not claim SOC 2", async ({ page }) => {
    await page.goto("/data-security");
    await expect(page.getByText("We do not currently publish a SOC 2 report")).toBeVisible();
  });

  test("auth page shows a 7-day trial, not invented metrics", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("7-day trial")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in to dashboard/i })).toBeVisible();
  });

  test("refund policy mentions the 7-day trial", async ({ page }) => {
    await page.goto("/refund");
    await expect(page.getByRole("heading", { name: /refund & cancellation policy/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "7-Day Free Trial" })).toBeVisible();
  });

  test("privacy policy page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });

  test("contact support does not claim SOC 2", async ({ page }) => {
    await page.goto("/contact-support");
    await page.getByText("Is my data secure?").click();
    await expect(page.getByText("We are not SOC 2 certified")).toBeVisible();
  });

  test("unauthenticated dashboard visits redirect to auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("button", { name: /sign in to dashboard/i })).toBeVisible();
  });

  test("documents route is wired and unauthenticated visits go to auth, not 404", async ({ page }) => {
    await page.goto("/dashboard/documents");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("button", { name: /sign in to dashboard/i })).toBeVisible();
    await expect(page.getByText("Oops! Page not found")).toHaveCount(0);
  });
});
