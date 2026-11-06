import { expect, onTestFinished, vi } from "vitest";
import { createKernel, createNavigableTable } from "../src/index.js";
import type { ClockPort, KeysOptions, NavigableTable, NavigationOptions } from "../src/index.js";

export interface TestNode {
  id: string;
  disabled?: boolean;
  children?: TestNode[];
}

export const tree: TestNode[] = [
  {
    id: "a",
    children: [{ id: "b", children: [{ id: "c" }] }, { id: "d", disabled: true }, { id: "e" }],
  },
  { id: "f", disabled: true },
  { id: "g" },
];

// Hotkeys owns its timers outside ClockPort. Virtualize that process boundary as well.
export function useVirtualClock(): void {
  vi.useFakeTimers({ now: 0 });
}

export function harness(keys?: KeysOptions) {
  const clock: ClockPort = {
    now: () => Date.now(),
    setTimeout(run, ms) {
      const timer = setTimeout(run, ms);
      return () => clearTimeout(timer);
    },
  };
  const errors: unknown[] = [];
  const warnings: string[] = [];
  const kernel = createKernel({
    ...(keys ? { keys } : {}),
    ports: {
      clock,
      reporter: {
        error: (cause) => {
          errors.push(cause);
        },
        warn: (message) => {
          warnings.push(message);
        },
      },
    },
  });
  const controllers: NavigableTable<TestNode>[] = [];
  onTestFinished(() => {
    for (const controller of controllers) controller.dispose();
    kernel.dispose();
    expect(errors, "unexpected command error").toEqual([]);
  });
  return {
    kernel,
    warnings,
    navigation(options: Partial<NavigationOptions<TestNode>> = {}) {
      const controller = createNavigableTable<TestNode>(kernel, {
        data: tree,
        getRowId: (node) => node.id,
        getSubRows: (node) => node.children,
        isDisabled: (node) => node.disabled ?? false,
        ...options,
      });
      controllers.push(controller);
      return controller;
    },
  };
}

export function press(
  key: string,
  options: KeyboardEventInit = {},
  target: EventTarget = document,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, ...options }));
  return event;
}

export const visibleIds = (navigation: NavigableTable<TestNode>) =>
  navigation.table.getRowModel().rows.map((row) => row.id);
