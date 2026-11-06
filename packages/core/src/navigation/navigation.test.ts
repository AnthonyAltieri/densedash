// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { harness, tree, useVirtualClock, visibleIds } from "../../test/harness.js";

beforeEach(useVirtualClock);
afterEach(() => vi.useRealTimers());

test("flattening exposes only expanded descendants in source order with their depth", () => {
  const navigation = harness().navigation();
  expect(visibleIds(navigation)).toEqual(["a", "f", "g"]);
  navigation.commands.expand({ key: "a" });
  expect(visibleIds(navigation)).toEqual(["a", "b", "d", "e", "f", "g"]);
  navigation.commands.expand({ key: "b" });
  expect(navigation.table.getRowModel().rows.map(({ id, depth }) => [id, depth])).toEqual([
    ["a", 0],
    ["b", 1],
    ["c", 2],
    ["d", 1],
    ["e", 1],
    ["f", 0],
    ["g", 0],
  ]);
});

test("movement counts enabled rows for next, previous and pages and clamps at either end", () => {
  const navigation = harness().navigation({ expanded: { defaultValue: true }, pageSize: 2 });
  const seen: (string | null)[] = [];
  const remember = () => seen.push(navigation.state.get().highlighted);
  navigation.commands.first();
  remember();
  navigation.commands.next();
  remember();
  navigation.commands.page(1);
  remember();
  navigation.commands.prev();
  remember();
  navigation.commands.last();
  remember();
  navigation.commands.next();
  remember();
  navigation.commands.page(-1);
  remember();
  navigation.commands.first();
  navigation.commands.prev();
  remember();
  expect(seen).toEqual(["a", "b", "e", "c", "g", "g", "c", "a"]);
});

test("looping movement wraps rather than getting stuck at the enabled endpoints", () => {
  const navigation = harness().navigation({ loop: true });
  navigation.commands.last();
  navigation.commands.next();
  expect(navigation.state.get().highlighted).toBe("a");
  navigation.commands.prev();
  expect(navigation.state.get().highlighted).toBe("g");
});

test("parent movement skips disabled ancestors without choosing an unrelated row", () => {
  const navigation = harness().navigation({
    data: [{ id: "a", children: [{ id: "b", disabled: true, children: [{ id: "c" }] }] }],
    expanded: { defaultValue: true },
  });
  navigation.setHighlighted("c");
  navigation.commands.parent();
  expect(navigation.state.get().highlighted).toBe("a");
});

test("DD-62: collapse on a leaf or closed branch never jumps to its parent", () => {
  const { navigation } = harness();
  const cases: { key: string; expanded: Record<string, boolean> }[] = [
    { key: "a", expanded: {} },
    { key: "b", expanded: { a: true } },
    { key: "c", expanded: { a: true, b: true } },
    { key: "e", expanded: { a: true } },
    { key: "g", expanded: {} },
  ];
  for (const { key, expanded } of cases) {
    const controller = navigation({ expanded: { defaultValue: expanded } });
    controller.setHighlighted(key);
    const before = controller.state.get();
    const updates: unknown[] = [];
    controller.state.subscribe((state) => updates.push(state));
    controller.commands.collapse();
    expect(controller.state.get()).toBe(before);
    expect(updates).toEqual([]);
    controller.dispose();
  }
});

test("single selection replaces the old row instead of accumulating or selecting children", () => {
  const navigation = harness().navigation({ expanded: { defaultValue: true } });
  navigation.commands.select({ key: "a" });
  navigation.commands.select({ key: "c" });
  expect(navigation.state.get().rowSelection).toEqual({ c: true });
});

test("multiple selection toggles a row and extends an inclusive range past disabled rows", () => {
  const navigation = harness().navigation({
    selectionMode: "multiple",
    expanded: { defaultValue: true },
  });
  navigation.commands.select({ key: "b" });
  navigation.commands.select({ key: "c" });
  navigation.commands.select({ key: "c" });
  expect(navigation.state.get().rowSelection).toEqual({ b: true });
  navigation.commands.extendSelection({ key: "e" });
  expect(navigation.state.get().rowSelection).toEqual({ c: true, e: true });
  expect(navigation.state.get().anchor).toBe("c");
});

test("reconciliation keeps a surviving cursor by id when data is reordered", () => {
  const navigation = harness().navigation();
  navigation.setHighlighted("g");
  navigation.update({ data: [...tree].reverse() });
  expect(navigation.state.get().highlighted).toBe("g");
});

test("data-only replacement still notifies subscribers when navigation state stays equal", () => {
  const navigation = harness().navigation({ data: [{ id: "a" }] });
  const observed: string[][] = [];
  navigation.state.subscribe(() => observed.push(visibleIds(navigation)));
  navigation.update({ data: [{ id: "b" }] });
  expect(observed).toEqual([["b"]]);
});

test("reconciliation chooses the following old survivor on a distance tie after removal or disabling", () => {
  const navigation = harness().navigation({ data: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  navigation.setHighlighted("b");
  navigation.update({ data: [{ id: "a" }, { id: "c" }] });
  expect(navigation.state.get().highlighted).toBe("c");
  navigation.update({ data: [{ id: "a" }, { id: "c", disabled: true }] });
  expect(navigation.state.get().highlighted).toBe("a");
  navigation.update({ data: [] });
  expect(navigation.state.get().highlighted).toBeNull();
});

test("hiding descendants prunes selection and anchor but retains their expansion for reopening", () => {
  const navigation = harness().navigation({
    selectionMode: "multiple",
    expanded: { defaultValue: true },
  });
  navigation.commands.select({ key: "c" });
  navigation.commands.collapse({ key: "a" });
  expect(navigation.state.get().rowSelection).toEqual({});
  expect(navigation.state.get().anchor).toBeNull();
  navigation.commands.expand({ key: "a" });
  expect(visibleIds(navigation)).toContain("c");
});

test("duplicate hidden ids reject an update without corrupting accepted data or state", () => {
  const navigation = harness().navigation();
  const before = navigation.state.get();
  expect(() => navigation.update({ data: [{ id: "a", children: [{ id: "a" }] }] })).toThrow(
    'Duplicate row id "a"',
  );
  expect(visibleIds(navigation)).toEqual(["a", "f", "g"]);
  expect(navigation.state.get()).toBe(before);
});
