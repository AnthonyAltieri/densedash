import { expect, test } from "@playwright/test";

test("table keys navigate nested rows and header/key sorting keeps children under their parent", async ({
  page,
}) => {
  await page.goto("/table");
  const frame = page.locator('[data-variant="table"]');
  await expect(frame.locator('[data-slot="frame-count"]')).toBeVisible();
  const table = frame.getByRole("treegrid", { name: "Quote board" });
  const cursor = table.locator('[data-slot="table-row"][data-highlighted]');
  await table.focus();
  await expect(cursor).toContainText("NVDA");
  await page.keyboard.press("j");
  await expect(cursor).toContainText("TSLA");
  await page.keyboard.press("k");
  await expect(cursor).toContainText("NVDA");
  await page.keyboard.press("Alt+ArrowUp");
  await expect(cursor).toContainText("US technology");
  await page.keyboard.press("h");
  await expect(cursor).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByRole("gridcell", { name: "NVDA", exact: true })).toHaveCount(0);
  await page.keyboard.press("l");
  await expect(cursor).toHaveAttribute("aria-expanded", "true");

  const names = table.locator('[data-slot="table-row"] > [data-slot="table-cell"]:first-child');
  const nameHeader = table.getByRole("columnheader", { name: /^Name/ });
  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(names).toHaveText([
    "Energy",
    "Equities",
    "Europe",
    "ASML",
    "SAP",
    "Financials",
    "US technology",
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
  ]);
  await table.focus();
  await page.keyboard.press("s");
  await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  await expect(names).toHaveText([
    "Equities",
    "US technology",
    "TSLA",
    "NVDA",
    "MSFT",
    "AAPL",
    "Financials",
    "Europe",
    "SAP",
    "ASML",
    "Energy",
  ]);
  await expect(cursor).toContainText("US technology");
});
