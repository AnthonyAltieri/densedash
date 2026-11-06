import { expect, test } from "@playwright/test";

test("tree keys navigate nested rows without collapsing a leaf or moving off a closed row", async ({
  page,
}) => {
  await page.goto("/tree");
  const frame = page.locator('[data-variant="tree"]');
  await expect(frame.locator('[data-slot="frame-count"]')).toBeVisible();
  const tree = frame.getByRole("tree", { name: "Desks" });
  const rows = tree.getByRole("treeitem");
  const cursor = tree.locator('[data-slot="tree-row"][data-highlighted]');
  await tree.focus();
  await expect(cursor).toContainText("MSFT");
  await page.keyboard.press("j");
  await expect(cursor).toContainText("NVDA");
  await page.keyboard.press("k");
  await expect(cursor).toContainText("MSFT");

  const initialRows = await rows.allTextContents();
  await page.keyboard.press("h");
  await expect(cursor).toContainText("MSFT");
  await expect(rows).toHaveText(initialRows);
  await page.keyboard.press("Alt+ArrowUp");
  await expect(cursor).toContainText("US technology");
  await page.keyboard.press("h");
  await expect(cursor).toHaveAttribute("aria-expanded", "false");
  await expect(rows.filter({ hasText: "MSFT" })).toHaveCount(0);

  const collapsedRows = await rows.allTextContents();
  await page.keyboard.press("h");
  await expect(cursor).toContainText("US technology");
  await expect(rows).toHaveText(collapsedRows);
  await page.keyboard.press("l");
  await expect(cursor).toHaveAttribute("aria-expanded", "true");
  await expect(rows.filter({ hasText: "MSFT" })).toBeVisible();
  await page.keyboard.press("j");
  await expect(cursor).toContainText("AAPL");
});
