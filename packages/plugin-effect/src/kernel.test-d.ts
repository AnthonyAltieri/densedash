import { expectTypeOf, test } from "vitest";
import { createKernel } from "@densedash/core";
import { effectPlugin } from "@densedash/plugin-effect";
import type { EffectStore } from "@densedash/plugin-effect";
import type { ManagedRuntime } from "effect";

declare const runtime: ManagedRuntime.ManagedRuntime<never, never>;

test("Effect plugin kernels retain writable atom stores instead of erasing the extension", () => {
  const plugin = effectPlugin({ runtime });
  const kernel = createKernel({ plugins: [plugin] });
  const store = kernel.ports.store.create(42);
  expectTypeOf(store).toEqualTypeOf<EffectStore<number>>();
  expectTypeOf(plugin.registry.get(store.atom)).toEqualTypeOf<number>();
});
