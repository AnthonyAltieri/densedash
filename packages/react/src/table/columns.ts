import { createColumnHelper } from "@tanstack/table-core";
import type { NavigationFeatures, RowData } from "@densedash/core";
import { isValidElement } from "react";
import type { ReactNode } from "react";

export type ColumnAlign = "start" | "end";
export type SortDirection = "ascending" | "descending";

/** Options of `columns<T>().accessor`. `V` is the column's value type, without `null`/`undefined`. */
export interface ColumnOptions<T, V> {
  /** Defaults to the column id. */
  readonly header?: ReactNode;
  /** Defaults to the accessor key. Unique per table. */
  readonly id?: string | undefined;
  /**
   * The values are numbers: the column aligns to the end, sets tabular figures, and a value that
   * is not a finite number or bigint (such as `"n/a"` from a feed) is missing.
   */
  readonly numeric?: boolean | undefined;
  /** Defaults to `"end"` for numeric columns and `"start"` otherwise. */
  readonly align?: ColumnAlign | undefined;
  /** A CSS grid track size, such as `"8rem"` or `"minmax(0, 2fr)"`. Defaults to `minmax(0, 1fr)`. */
  readonly width?: string | undefined;
  /**
   * The first direction a sort applies: `"asc"` (the default) cycles ascending, descending,
   * unsorted; `"desc"` starts descending. `false` makes the column unsortable.
   */
  readonly sort?: "asc" | "desc" | false | undefined;
  /** Orders two present values. Defaults to numeric order, or natural text order for strings. */
  readonly compare?: ((a: V, b: V) => number) | undefined;
  /** Renders a present value. Missing values render empty. Defaults to the value as text. */
  readonly format?: ((value: V, item: T) => ReactNode) | undefined;
}

/** Options of a computed column, `accessor((item) => …, { id, … })`, which needs an id. */
export interface ComputedColumnOptions<T, V> extends ColumnOptions<T, V> {
  readonly id: string;
}

/** What the parts read from a column besides its TanStack definition. */
export interface TableColumnMeta<in T> {
  readonly align: ColumnAlign;
  readonly numeric: boolean;
  readonly width: string | undefined;
  /** Renders a present value (one the accessor did not report as missing). */
  render(value: unknown, item: T): ReactNode;
}

/**
 * A TanStack column definition made by `columns<T>()`: at runtime it has TanStack's
 * `accessorFn`, `cell`, `sortFn`, `sortUndefined: "last"`, `enableSorting` and `sortDescFirst`,
 * so `table.table?.getColumn(id)` reads it. Its type names only what the parts read, which keeps
 * a wide table cheap to typecheck. The accessor returns `undefined` for a missing value.
 */
export interface TableColumnDef<in T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly enableSorting: boolean;
  readonly meta: TableColumnMeta<T>;
}

/**
 * Defines TanStack columns for row items of type `T`, wrapping TanStack's `createColumnHelper`.
 * `accessor("pnl", …)` types `format` and `compare` with the field's type, and an unknown field
 * is a compile error. Keys are top-level fields; pass a function for anything else.
 */
export interface ColumnHelper<in out T> {
  /** A column that reads one top-level field of the row item. */
  accessor<K extends keyof T & string>(
    key: K,
    options?: ColumnOptions<T, NonNullable<T[K]>>,
  ): TableColumnDef<T>;
  /** A column whose value the function computes from the row item. */
  accessor<V>(
    accessor: (item: T, index: number) => V,
    options: ComputedColumnOptions<T, NonNullable<V>>,
  ): TableColumnDef<T>;
}

const collator = new Intl.Collator(undefined, { numeric: true });

function compareDefault(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  if ((typeof a === "number" || typeof a === "bigint") && typeof a === typeof b) {
    return a < (b as typeof a) ? -1 : a > (b as typeof a) ? 1 : 0;
  }
  return 0;
}

function renderDefault(value: unknown): ReactNode {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  return isValidElement(value) ? value : null;
}

/** The value, or undefined when it is missing: nullish, a non-finite number, or not numeric. */
function present(value: unknown, numeric: boolean): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return numeric && typeof value !== "bigint" ? undefined : value;
}

type Options = ColumnOptions<unknown, unknown>;
type Read = (item: unknown, index: number) => unknown;
interface Sortable {
  getValue(id: string): unknown;
}

const tanstack = createColumnHelper<NavigationFeatures, RowData>();

function define(id: string, read: Read, options: Options): TableColumnDef<unknown> {
  const { header, numeric = false, align, width, sort, compare = compareDefault, format } = options;
  // A real TanStack definition; the parts read the narrow members of `TableColumnDef`.
  const column = tanstack.accessor((item, index) => present(read(item, index), numeric), {
    id,
    // The parts render any ReactNode header; TanStack's type names its string and templates.
    header: (header ?? id) as string,
    cell: (info) => {
      const value = info.getValue();
      return value === undefined ? null : (format ?? renderDefault)(value, info.row.original);
    },
    // Missing values are `undefined`, which `sortUndefined` keeps last in both directions.
    sortFn: (a: Sortable, b: Sortable, columnId: string) =>
      compare(a.getValue(columnId), b.getValue(columnId)),
    sortUndefined: "last",
    enableSorting: sort !== false,
    sortDescFirst: sort === "desc",
    meta: {
      align: align ?? (numeric ? "end" : "start"),
      numeric,
      width,
      render: format ?? renderDefault,
    } satisfies TableColumnMeta<unknown>,
  });
  return column as unknown as TableColumnDef<unknown>;
}

function read(item: unknown, key: string): unknown {
  return typeof item === "object" && item !== null
    ? (item as Record<string, unknown>)[key]
    : undefined;
}

const helper = {
  accessor(accessor: string | Read, options: Options = {}): TableColumnDef<unknown> {
    if (typeof accessor === "function") return define(options.id ?? "", accessor, options);
    return define(options.id ?? accessor, (item) => read(item, accessor), options);
  },
} as ColumnHelper<unknown>;

/** Returns the column helper for row items of type `T`: `const col = columns<Idea>()`. */
export function columns<T>(): ColumnHelper<T> {
  return helper as ColumnHelper<T>;
}
