import { expectTypeOf, test } from "vitest";
import { columns, Table, Tree, useList, useTable, useTree } from "@densedash/react";
import type { TableHandle, TreeHandle } from "@densedash/react";

const data = [{ id: "idea", price: 42 }];
type Item = (typeof data)[number];

test("useTree infers callbacks and viewport rows from data", () => {
  const tree = useTree({
    data,
    getRowId(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
      return item.id;
    },
    onOpen(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
    },
  });
  expectTypeOf(tree).toEqualTypeOf<TreeHandle<Item>>();
  Tree.Viewport({
    tree,
    children(row) {
      expectTypeOf(row.original).toEqualTypeOf<Item>();
      return row.original.price;
    },
  });
});

test("useList retains data inference through the tree adapter", () => {
  const list = useList({
    data,
    getRowId(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
      return item.id;
    },
    onOpen(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
    },
  });
  expectTypeOf(list).toEqualTypeOf<TreeHandle<Item>>();
});

test("useTable infers items from data and rejects columns for a different row shape", () => {
  const table = useTable({
    data,
    columns: [columns<Item>().accessor("price")],
    getRowId(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
      return item.id;
    },
    onOpen(item) {
      expectTypeOf(item).toEqualTypeOf<Item>();
    },
  });
  expectTypeOf(table).toEqualTypeOf<TableHandle<Item>>();
  Table.Viewport({
    table,
    children(row) {
      expectTypeOf(row.original).toEqualTypeOf<Item>();
      return row.original.price;
    },
  });
  const wrongColumns = [columns<{ missing: string }>().accessor("missing")];
  // @ts-expect-error Columns cannot replace the item type established by data.
  useTable({ data, columns: wrongColumns, getRowId: (item) => item.id });
});
