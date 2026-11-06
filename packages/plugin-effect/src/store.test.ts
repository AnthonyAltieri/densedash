import { describe, onTestFinished, test } from "vitest";
import { Layer, ManagedRuntime } from "effect";
import { createKernel } from "../../core/src/index.js";
import { runContract, storeContract } from "../../core/src/conformance/index.js";
import { effectPlugin } from "./index.js";

describe("Effect store conformance", () => {
  runContract({
    test,
    cases: storeContract,
    make() {
      const runtime = ManagedRuntime.make(Layer.empty);
      const plugin = effectPlugin({ runtime });
      const kernel = createKernel({ plugins: [plugin] });
      onTestFinished(async () => {
        try {
          kernel.dispose();
        } finally {
          await runtime.dispose();
        }
      });
      return kernel.ports.store;
    },
  });
});
