// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, onTestFinished, test, vi } from "vitest";
import { createKernel } from "@densedash/core";
import { Densedash, Tree, useTree } from "../index.js";
import type { TreeHandle, UseTreeOptions } from "../index.js";

const data = [{ id: "a" }, { id: "b" }];
type Item = (typeof data)[number];
const options: UseTreeOptions<Item> = { data, getRowId: (item) => item.id };

async function mount(initial: UseTreeOptions<Item>) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const kernel = createKernel();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let tree: TreeHandle<Item>;
  function Consumer({ options }: { options: UseTreeOptions<Item> }) {
    tree = useTree(options);
    return createElement(Tree.Root, { tree });
  }
  async function render(options: UseTreeOptions<Item>) {
    await act(() => {
      root.render(
        createElement(Densedash.Provider, { kernel }, createElement(Consumer, { options })),
      );
    });
    return tree;
  }
  onTestFinished(async () => {
    try {
      await act(() => root.unmount());
      kernel.dispose();
    } finally {
      container.remove();
      vi.unstubAllGlobals();
    }
  });
  return { tree: await render(initial), render };
}

test("a mounted handle calls the current onOpen after a React rerender", async () => {
  const calls: string[] = [];
  const { tree, render } = await mount({
    ...options,
    onOpen: (item) => calls.push(`old:${item.id}`),
  });
  await act(() => {
    tree.commands.first();
    tree.commands.open();
  });
  await render({ ...options, onOpen: (item) => calls.push(`new:${item.id}`) });
  await act(() => tree.commands.open());
  expect(calls).toEqual(["old:a", "new:a"]);
});

test("a controlled highlight follows React props without drifting on a command request", async () => {
  const requested: (string | null)[] = [];
  const { tree, render } = await mount({
    ...options,
    highlighted: { value: "a", onChange: (value) => requested.push(value) },
  });
  await act(() => tree.commands.next());
  expect(requested).toEqual(["b"]);
  expect(tree.state.get().highlighted).toBe("a");
  await render({ ...options, highlighted: { value: "b" } });
  expect(tree.state.get().highlighted).toBe("b");
});
