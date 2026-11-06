import { expect, test } from "@playwright/test";

test("app shell layers answer across panes while typing leaves every layer unchanged", async ({
  page,
}) => {
  await page.goto("/app-shell");
  const shell = page.locator('[data-slot="app-shell"]');
  const sidebar = shell.getByRole("tree", { name: "Navigation" });
  const list = shell.getByRole("listbox", { name: "Ideas" });
  const sidebarCursor = sidebar.locator('[data-slot="tree-row"][data-highlighted]');
  const listCursor = list.locator('[data-slot="tree-row"][data-highlighted]');
  const detail = shell.locator('[data-slot="app-shell-detail"]');
  await expect(sidebarCursor).toContainText("Ideas");
  await expect(listCursor).toContainText("Funding carry");

  // Focus outside the shell: both collection layers must still answer.
  const heading = page.getByRole("heading", { name: "App shell", exact: true });
  await heading.evaluate((element) => element.setAttribute("tabindex", "-1"));
  await heading.focus();
  await page.keyboard.press("j");
  await expect(sidebarCursor).toContainText("Next");
  await page.keyboard.press("h");
  await expect(sidebarCursor).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("l");
  await expect(sidebarCursor).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("k");
  await expect(sidebarCursor).toContainText("Ideas");

  await page.keyboard.press("Shift+j");
  await expect(listCursor).toContainText("run #14");
  await expect(detail.getByRole("heading", { name: "run #14", exact: true })).toBeVisible();
  await page.keyboard.press("Shift+k");
  await expect(listCursor).toContainText("Funding carry");
  await page.keyboard.press("Shift+h");
  await expect(list.getByRole("option").filter({ hasText: "run #14" })).toHaveCount(0);
  await page.keyboard.press("Shift+l");
  await expect(list.getByRole("option").filter({ hasText: "run #14" })).toBeVisible();

  // Focus in the sidebar: the detail layer must still answer.
  await sidebar.focus();
  await page.keyboard.press("2");
  await expect(detail.getByRole("tab", { name: /Runs/ })).toHaveAttribute("aria-selected", "true");
  await expect(detail.getByRole("tabpanel")).toContainText("run #14");
  await page.keyboard.press("3");
  await expect(detail.getByRole("tab", { name: /Log/ })).toHaveAttribute("aria-selected", "true");
  await expect(detail.getByRole("tabpanel")).toContainText("checkpoint written");
  await page.keyboard.press("1");
  await expect(detail.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // This example has no field; a real DOM input exercises the browser's input filtering.
  await detail.evaluate((element) => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "E2E note");
    element.append(input);
  });
  const input = detail.getByRole("textbox", { name: "E2E note" });
  await input.focus();
  await page.keyboard.type("jklhJKLH123");
  await expect(input).toHaveValue("jklhJKLH123");
  await expect(sidebarCursor).toContainText("Ideas");
  await expect(listCursor).toContainText("Funding carry");
  await expect(sidebar.getByRole("treeitem").filter({ hasText: /^Next/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(list.getByRole("option").filter({ hasText: "run #14" })).toBeVisible();
  await expect(detail.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
