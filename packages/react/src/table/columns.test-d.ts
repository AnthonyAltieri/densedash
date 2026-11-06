import { expectTypeOf, test } from "vitest";
import { columns } from "@densedash/react";

interface Item {
  id: string;
  price?: number | null;
}
const col = columns<Item>();

test("key accessors infer present field values in format and both compare arguments", () => {
  col.accessor("price", {
    format(value, item) {
      expectTypeOf(value).toEqualTypeOf<number>();
      expectTypeOf(item).toEqualTypeOf<Item>();
      return value.toFixed(2);
    },
    compare(a, b) {
      expectTypeOf(a).toEqualTypeOf<number>();
      expectTypeOf(b).toEqualTypeOf<number>();
      return a - b;
    },
  });
});

test("computed accessors propagate their return type to format and compare", () => {
  col.accessor((item) => item.id.toUpperCase(), {
    id: "symbol",
    format(value, item) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(item).toEqualTypeOf<Item>();
      return value;
    },
    compare(a, b) {
      expectTypeOf(a).toEqualTypeOf<string>();
      expectTypeOf(b).toEqualTypeOf<string>();
      return a.localeCompare(b);
    },
  });
});

test("unknown accessor keys fail instead of silently rendering an empty column", () => {
  // @ts-expect-error Only top-level keys of Item are accepted.
  col.accessor("prcie");
});
