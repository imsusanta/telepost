import { expect, test } from "@playwright/test";

test.describe("public marketing pages", () => {
  test("landing FAQ states 7-day trial, no SOC 2, and not telepost.me", async ({ page }) => {
    await page.goto("/");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: /frequently asked/i })).toBeVisible();

    await page.getByRole("button", { name: "Is my data secure?" }).click();
    await expect(page.getByText("We are not SOC 2 certified.")).toBeVisible();

    await page.getByRole("button", { name: "What's included in the free trial?" }).click();
    await expect(page.getByText("7-day trial")).toBeVisible();

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
});
