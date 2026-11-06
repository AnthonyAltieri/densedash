import { expectTypeOf, test } from "vitest";
import { createKernel } from "@densedash/core";
import type { Plugin, Ports, StorePort } from "@densedash/core";
import { createKernel as createBareKernel } from "@densedash/core/bare";

declare const pluginStore: StorePort & { readonly provider: "plugin" };
declare const explicitStore: StorePort & { readonly provider: "explicit" };
declare const base: Omit<Ports, "store">;
const plugin = {
  name: "typed-store",
  provides: { store: () => pluginStore },
} satisfies Plugin;
declare const maybePlugin: readonly [] | readonly [typeof plugin];
declare const optionalPorts: { store?: typeof explicitStore };

test("installed plugin tuples preserve extended ports in main and bare kernels", () => {
  const kernel = createKernel({ plugins: [plugin] });
  const bare = createBareKernel({ plugins: [plugin], ports: base });
  expectTypeOf(kernel.ports.store).toEqualTypeOf<typeof pluginStore>();
  expectTypeOf(bare.ports.store).toEqualTypeOf<typeof pluginStore>();
  expectTypeOf(kernel.ports.keyboard).toEqualTypeOf<Ports["keyboard"]>();
});

test("required explicit ports take type precedence over installed plugin ports", () => {
  const kernel = createKernel({ plugins: [plugin], ports: { store: explicitStore } });
  expectTypeOf(kernel.ports.store).toEqualTypeOf<typeof explicitStore>();
});

test("optional plugins and overrides cannot promise extensions that may be absent", () => {
  const plugins = [plugin];
  const dynamic = createKernel({ plugins });
  expectTypeOf(dynamic.ports.store).toEqualTypeOf<StorePort>();
  // @ts-expect-error A runtime-sized plugin array may be empty.
  void dynamic.ports.store.provider;

  const optional = createKernel({ plugins: maybePlugin });
  expectTypeOf(optional.ports.store).toEqualTypeOf<StorePort | typeof pluginStore>();

  const override = createKernel({ plugins: [plugin], ports: optionalPorts });
  expectTypeOf(override.ports.store).toEqualTypeOf<typeof explicitStore | typeof pluginStore>();
});
