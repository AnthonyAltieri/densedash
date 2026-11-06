import { expect, test } from "@playwright/test";

test("a sequence shows its pending hint and dispatches the second key", async ({ page }) => {
  await page.goto("/keymap");
  const example = page.locator('[data-variant="keymap-sequence"]');
  await example.getByRole("button", { name: /^Home/ }).click();
  await page.keyboard.press("g");
  const hint = example.getByRole("status", { name: "Next keys" });
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("Portfolio");
  await page.keyboard.press("p");
  await expect(example.locator('[data-slot="page"]')).toHaveText("Portfolio");
  await expect(example.getByRole("button", { name: /^Portfolio/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(hint).toHaveCount(0);
});

test("confirmation keys and Approve/Reject clicks never run an order before confirmation", async ({
  page,
}) => {
  await page.goto("/keymap");
  const example = page.locator('[data-variant="keymap-confirm"]');
  const order = example.locator('[data-slot="order"]');
  const prompt = example.getByRole("alert");
  // A scope descendant receives real focus for the keyboard path in both engines.
  await example.getByRole("button", { name: "Reset", exact: true }).focus();
  await page.keyboard.press("a");
  await expect(prompt).toContainText("Approve this order?");
  await expect(order).toHaveAttribute("data-stage", "review");
  await page.keyboard.press("Escape");
  await expect(prompt).toHaveCount(0);
  await expect(order).toHaveAttribute("data-stage", "review");
  await page.keyboard.press("a");
  await expect(prompt).toContainText("Approve this order?");
  await page.keyboard.press("Enter");
  await expect(order).toHaveAttribute("data-stage", "approved");
  await expect(prompt).toHaveCount(0);
  await example.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(order).toHaveAttribute("data-stage", "review");

  // Leave the scope before each action click. WebKit clicks do not focus buttons.
  const heading = page.getByRole("heading", { name: "Keymap", exact: true });
  await heading.evaluate((element) => element.setAttribute("tabindex", "-1"));
  await heading.focus();
  await example.getByRole("button", { name: /^Approve/ }).click();
  await expect(prompt).toContainText("Approve this order?");
  await expect(order).toHaveAttribute("data-stage", "review");
  await prompt.getByRole("button", { name: /Cancel/ }).click();
  await expect(prompt).toHaveCount(0);
  await expect(order).toHaveAttribute("data-stage", "review");
  await heading.focus();
  await example.getByRole("button", { name: /^Reject/ }).click();
  await expect(prompt).toContainText("Reject this order?");
  await expect(order).toHaveAttribute("data-stage", "review");
  await prompt.getByRole("button", { name: /Confirm/ }).click();
  await expect(order).toHaveAttribute("data-stage", "rejected");
  await expect(prompt).toHaveCount(0);
});
