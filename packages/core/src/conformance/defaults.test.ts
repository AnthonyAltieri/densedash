// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, test, vi } from "vitest";
import { harness, useVirtualClock } from "../../test/harness.js";
import { keyboardContract, runContract, storeContract } from "./index.js";

describe("default store conformance", () => {
  runContract({ test, cases: storeContract, make: () => harness().kernel.ports.store });
});

describe("default keyboard conformance", () => {
  // Hotkeys owns Date/timers outside ClockPort, as in the first core suite.
  beforeEach(useVirtualClock);
  afterEach(() => vi.useRealTimers());

  runContract({
    test,
    cases: keyboardContract({
      advanceTime: (ms) => {
        vi.advanceTimersByTime(ms);
      },
    }),
    make: () => harness().kernel.ports.keyboard,
  });
});
