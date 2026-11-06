import { expectTypeOf, test } from "vitest";
import { createNavigableTable } from "@densedash/core";
import type { Kernel } from "@densedash/core";

declare const kernel: Kernel;
const data = [{ id: "idea", price: 42 }];
type Item = (typeof data)[number];

test("core infers callback items and table rows from data without an explicit generic", () => {
  const navigation = createNavigableTable(kernel, {
    data,
    getRowId(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
      return item.id;
    },
    onOpen(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
    },
  });
  expectTypeOf(navigation.table.getRow("idea").original).toEqualTypeOf<Item>();
  // @ts-expect-error Callbacks cannot invent fields absent from data.
  createNavigableTable(kernel, { data, onOpen: (item: Item & { missing: string }) => item });
});
