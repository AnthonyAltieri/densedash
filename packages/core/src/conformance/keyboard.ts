import type { ContractCase } from "./index.js";
import type { KeyboardPort } from "../ports/keyboard.js";

export type MakeKeyboardPort = () => KeyboardPort;

export interface KeyboardContractOptions {
  /** Advance both Date.now() and scheduled timers, e.g. vi.advanceTimersByTime. */
  readonly advanceTime: (milliseconds: number) => void | Promise<void>;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function press(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
}

async function withKeyboard(
  make: MakeKeyboardPort,
  run: (port: KeyboardPort, target: HTMLDivElement) => void | Promise<void>,
): Promise<void> {
  const port = make();
  const target = document.createElement("div");
  target.tabIndex = 0;
  document.body.append(target);
  target.focus();
  try {
    await run(port, target);
  } finally {
    port.dispose();
    target.remove();
  }
}

/** Track actual listener identities and capture phases, including duplicate additions. */
function trackListeners(target: EventTarget) {
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  const listeners: {
    type: string;
    listener: EventListenerOrEventListenerObject;
    capture: boolean;
  }[] = [];
  target.addEventListener = (type, listener, options) => {
    const capture = typeof options === "boolean" ? options : (options?.capture ?? false);
    if (
      listener &&
      !listeners.some(
        (entry) => entry.type === type && entry.listener === listener && entry.capture === capture,
      )
    ) {
      listeners.push({ type, listener, capture });
    }
    add.call(target, type, listener, options);
  };
  target.removeEventListener = (type, listener, options) => {
    const capture = typeof options === "boolean" ? options : (options?.capture ?? false);
    const index = listeners.findIndex(
      (entry) => entry.type === type && entry.listener === listener && entry.capture === capture,
    );
    if (index >= 0) listeners.splice(index, 1);
    remove.call(target, type, listener, options);
  };
  return {
    count: () => listeners.length,
    restore() {
      target.addEventListener = add;
      target.removeEventListener = remove;
    },
  };
}

/**
 * DOM conformance cases, independent of a test runner. Each make() returns a fresh
 * port. Install DOM globals and fake Date/timers before running; supply an advanceTime
 * hook that advances both. Cases own their targets and dispose every created port.
 */
export function keyboardContract({
  advanceTime,
}: KeyboardContractOptions): readonly ContractCase<MakeKeyboardPort>[] {
  return [
    {
      name: "nested scope beats a later parent activation",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const calls: string[] = [];
          port.bind("K", () => calls.push("parent"), { target, scope: "parent" });
          port.bind("K", () => calls.push("child"), { target, scope: "child" });
          const child = port.activateScope("child", { parent: "parent" });
          port.activateScope("parent");
          press(target, "k");
          child();
          child();
          press(target, "k");
          assert(calls.join() === "child,parent", "A child must beat its parent until released.");
        }),
    },
    {
      name: "most recently activated peer scope wins",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const calls: string[] = [];
          port.bind("K", () => calls.push("first"), { target, scope: "first" });
          port.bind("K", () => calls.push("second"), { target, scope: "second" });
          port.activateScope("first");
          const second = port.activateScope("second");
          press(target, "k");
          second();
          press(target, "k");
          assert(calls.join() === "second,first", "The latest peer must win until released.");
        }),
    },
    {
      name: "exclusive scope blocks others except allow and descendants",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const calls: string[] = [];
          port.bind("G", () => calls.push("global"), { target });
          port.bind("B", () => calls.push("blocked"), { target, scope: "background" });
          port.bind("H", () => calls.push("help"), { target, scope: "help" });
          port.bind("D", () => calls.push("dialog"), { target, scope: "dialog" });
          port.bind("C", () => calls.push("child"), { target, scope: "child" });
          port.activateScope("background");
          port.activateScope("help");
          const exclusive = port.activateScope("dialog", { exclusive: { allow: ["help"] } });
          port.activateScope("child", { parent: "dialog" });
          for (const key of ["g", "b", "h", "d", "c"]) press(target, key);
          assert(
            calls.join() === "help,dialog,child",
            "Exclusive scopes must honor allow and descendants.",
          );
          exclusive();
          const strict = port.activateScope("dialog", { exclusive: true });
          press(target, "h");
          assert(
            calls.join() === "help,dialog,child",
            "exclusive: true must suspend other scopes.",
          );
          strict();
          press(target, "g");
          assert(calls.at(-1) === "global", "Release must restore global bindings.");
        }),
    },
    {
      name: "scope activations are counted and releases are idempotent",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          let calls = 0;
          port.bind("K", () => calls++, { target, scope: "panel" });
          const first = port.activateScope("panel");
          const second = port.activateScope("panel");
          first();
          first();
          press(target, "k");
          second();
          press(target, "k");
          assert(calls === 1, "A scope stays active until every activation is released.");
        }),
    },
    {
      name: "sequence timeout clears pending and prevents completion",
      run: (make) =>
        withKeyboard(make, async (port, target) => {
          let calls = 0;
          port.bind(["G", "H"], () => calls++, { target, timeout: 50 });
          press(target, "g");
          assert(port.pending.get().length === 1, "The first step must start a sequence.");
          await advanceTime(51);
          assert(
            port.pending.get().length === 0,
            "Timeout must clear pending without another event.",
          );
          press(target, "h");
          assert(calls === 0, "An expired sequence must not complete.");
        }),
    },
    {
      name: "pending publishes sequence progress and completion",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          let calls = 0;
          const progress: number[] = [];
          const unsubscribe = port.pending.subscribe((state) =>
            progress.push(state[0]?.matchedStepCount ?? 0),
          );
          try {
            port.bind(["G", "H", "J"], () => calls++, { target });
            press(target, "g");
            const pending = port.pending.get()[0];
            assert(
              pending?.matchedStepCount === 1 &&
                pending.hotkey.join() === "G,H,J" &&
                pending.target === target &&
                pending.scope === "global",
              "Pending must identify the sequence and its first matched step.",
            );
            press(target, "h");
            assert(
              port.pending.get()[0]?.matchedStepCount === 2,
              "Pending must advance with each step.",
            );
            press(target, "j");
            assert(
              calls === 1 &&
                port.pending.get().length === 0 &&
                progress.includes(1) &&
                progress.includes(2) &&
                progress.at(-1) === 0,
              "Completion must notify subscribers and clear pending.",
            );
          } finally {
            unsubscribe();
          }
        }),
    },
    {
      name: "ignoreInputs auto skips typing in inputs",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          let calls = 0;
          port.bind("K", () => calls++, { target, ignoreInputs: "auto" });
          const input = document.createElement("input");
          target.append(input);
          input.focus();
          press(input, "k");
          assert(calls === 0, "Typing in an input must be ignored.");
          target.focus();
          press(target, "k");
          assert(calls === 1, "The binding must still work outside the input.");
        }),
    },
    {
      name: "binding updates toggle enabled and replace the handler",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const calls: string[] = [];
          const binding = port.bind("K", () => calls.push("old"), { target, enabled: false });
          press(target, "k");
          assert(calls.length === 0, "A disabled binding must not fire.");
          binding.update({ enabled: true, handler: () => calls.push("new") });
          press(target, "k");
          binding.update({ enabled: false });
          press(target, "k");
          assert(calls.join() === "new", "Updates must toggle enabled and use the latest handler.");
        }),
    },
    {
      name: "binding disposal releases listeners and ignores later updates",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const tracker = trackListeners(target);
          let calls = 0;
          try {
            const binding = port.bind("K", () => calls++, { target });
            press(target, "k");
            assert(calls === 1 && tracker.count() > 0, "A live binding must listen and fire.");
            binding.dispose();
            binding.dispose();
            binding.update({ enabled: true });
            press(target, "k");
            assert(
              calls === 1 && tracker.count() === 0,
              "Binding disposal must remove every listener.",
            );
          } finally {
            port.dispose();
            tracker.restore();
          }
        }),
    },
    {
      name: "port disposal releases all targets and clears pending",
      run: (make) =>
        withKeyboard(make, (port, target) => {
          const trackers = [target, document, window].map(trackListeners);
          let calls = 0;
          try {
            const release = port.activateScope("panel");
            const binding = port.bind("K", () => calls++, { target, scope: "panel" });
            port.bind("D", () => calls++, { target: document });
            port.bind("W", () => calls++, { target: window });
            port.bind(["G", "H"], () => calls++, { target });
            press(target, "g");
            assert(
              port.pending.get().length === 1 && trackers.every((tracker) => tracker.count() > 0),
              "The port must own listeners on every bound target.",
            );
            port.dispose();
            port.dispose();
            release();
            release();
            binding.dispose();
            binding.update({ enabled: true });
            for (const key of ["k", "d", "w", "h"]) press(target, key);
            assert(
              calls === 0 &&
                port.pending.get().length === 0 &&
                trackers.every((tracker) => tracker.count() === 0),
              "Disposal must clear pending and release every listener on every target.",
            );
          } finally {
            port.dispose();
            for (const tracker of trackers) tracker.restore();
          }
        }),
    },
  ];
}
