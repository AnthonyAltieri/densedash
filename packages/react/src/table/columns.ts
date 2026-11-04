import { isValidElement } from "react";
import type { ReactNode } from "react";

export type ColumnAlign = "start" | "end";
export type SortDirection = "ascending" | "descending";

export interface TableSort {
  readonly column: string;
  readonly direction: SortDirection;
}

/**
 * The runtime type of a column's values, inferred from the data: the most common type among
 * present values. Missing values (`null`, `undefined`, `NaN`, infinities) do not count.
 */
export type ValueKind = "string" | "number" | "bigint" | "boolean" | "object";

/** Column kinds by column id; a column without present values has no kind. */
export type ColumnKinds = ReadonlyMap<string, ValueKind>;

/** Column options. `V` is the column's value type: the accessed field's, or what `cell` returns. */
export interface ColumnOptions<T, V> {
  readonly header: ReactNode;
  /** Defaults to the accessor; `cell` columns take theirs as an argument. Unique per table. */
  readonly id?: string | undefined;
  /** Defaults to `"end"` when the column's values are numbers. */
  readonly align?: ColumnAlign | undefined;
  /** A CSS grid track size, such as `"8rem"` or `"minmax(0, 2fr)"`. Defaults to `minmax(0, 1fr)`. */
  readonly width?: string | undefined;
  /** Orders two present values; `false` makes the column unsortable. */
  readonly sort?: ((a: V, b: V) => number) | false | undefined;
  /** Renders a present value. Missing values and values of another type render empty. */
  readonly format?: ((value: V, item: T) => ReactNode) | undefined;
}

/** A defined column. Its value type is checked where it is defined, then erased. */
export interface Column<T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly align: ColumnAlign | undefined;
  readonly width: string | undefined;
  readonly sortable: boolean;
  /** The raw value. App data is untrusted, so it may be missing or of another type. */
  value(item: T): unknown;
  /** Orders two present values of the column's kind. */
  compare(a: unknown, b: unknown): number;
  /** Renders a present value of the column's kind. */
  render(value: unknown, item: T): ReactNode;
}

/**
 * Defines columns for row items of type `T`, like TanStack Table's `createColumnHelper`.
 * `accessor("pnl", …)` types `format` and `sort` with the field's type, and an unknown field
 * is a compile error. Accessors are top-level keys only.
 */
export interface ColumnHelper<T> {
  /** A column that reads one top-level field of the row item. */
  accessor<K extends keyof T & string>(
    accessor: K,
    options: ColumnOptions<T, NonNullable<T[K]>>,
  ): Column<T>;
  /** A column whose value `cell(item)` computes. */
  cell<V>(id: string, cell: (item: T) => V, options: ColumnOptions<T, NonNullable<V>>): Column<T>;
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

function read(item: unknown, accessor: string): unknown {
  return typeof item === "object" && item !== null
    ? (item as Record<string, unknown>)[accessor]
    : undefined;
}

type AnyOptions = ColumnOptions<unknown, unknown>;

function define(
  id: string,
  value: (item: unknown) => unknown,
  options: AnyOptions,
): Column<unknown> {
  const { sort, format } = options;
  return {
    id: options.id ?? id,
    header: options.header,
    align: options.align,
    width: options.width,
    sortable: sort !== false,
    value,
    compare: typeof sort === "function" ? sort : compareDefault,
    render: format ?? renderDefault,
  };
}

const helper: ColumnHelper<unknown> = {
  accessor: (accessor, options) =>
    define(accessor, (item) => read(item, accessor), options as AnyOptions),
  cell: (id, cell, options) => define(id, cell, { ...(options as AnyOptions), id }),
};

/** Returns the column helper for row items of type `T`: `const column = columns<Idea>()`. */
export function columns<T>(): ColumnHelper<T> {
  return helper as ColumnHelper<T>;
}

/** The kind of a present value, or undefined for a missing one. */
export function kindOf(value: unknown): ValueKind | undefined {
  switch (typeof value) {
    case "string":
      return "string";
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "number":
      return Number.isFinite(value) ? "number" : undefined;
    case "object":
      return value === null ? undefined : "object";
    default:
      return undefined;
  }
}

/** The column's value when it is present and of the column's kind; otherwise undefined. */
export function presentValue<T>(column: Column<T>, kind: ValueKind | undefined, item: T): unknown {
  if (kind === undefined) return undefined;
  const value = column.value(item);
  return kindOf(value) === kind ? value : undefined;
}

/** `align` if given, else `"end"` for numeric columns. */
export function columnAlign(column: Column<unknown>, kind: ValueKind | undefined): ColumnAlign {
  return column.align ?? (kind === "number" || kind === "bigint" ? "end" : "start");
}

type GetChildren<T> = (item: T) => readonly T[] | undefined;

/** Every item once, parents before children; repeated items (and cycles) are skipped. */
function walk<T>(
  roots: readonly T[],
  getChildren: GetChildren<T> | undefined,
  visit: (item: T) => void,
) {
  const seen = new Set<T>();
  const stack: T[] = [...roots].reverse();
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (seen.has(item)) continue;
    seen.add(item);
    visit(item);
    const children = getChildren?.(item);
    if (Array.isArray(children)) {
      for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
    }
  }
}

/** Infers each column's kind from every item, including collapsed children. */
export function inferKinds<T>(
  roots: readonly T[],
  getChildren: GetChildren<T> | undefined,
  columns: readonly Column<T>[],
): ColumnKinds {
  const counts = columns.map(() => new Map<ValueKind, number>());
  walk(roots, getChildren, (item) => {
    for (let index = 0; index < columns.length; index++) {
      const kind = kindOf(columns[index]!.value(item));
      if (kind === undefined) continue;
      const count = counts[index]!;
      count.set(kind, (count.get(kind) ?? 0) + 1);
    }
  });
  const kinds = new Map<string, ValueKind>();
  columns.forEach((column, index) => {
    let best: ValueKind | undefined;
    let most = 0;
    // Map order is first-seen order, so ties go to the type seen first.
    for (const [kind, count] of counts[index]!) {
      if (count > most) {
        best = kind;
        most = count;
      }
    }
    if (best !== undefined) kinds.set(column.id, best);
  });
  return kinds;
}

export interface SortedRows<T> {
  readonly roots: readonly T[];
  /** Returns each item's sorted children; undefined when the rows do not nest. */
  readonly getChildren: GetChildren<T> | undefined;
}

export interface GetSortedRowsOptions<T> {
  readonly roots: readonly T[];
  readonly getChildren?: GetChildren<T> | undefined;
  readonly columns: readonly Column<T>[];
  readonly sort: TableSort | null;
  /** Defaults to `inferKinds(roots, getChildren, columns)`. */
  readonly kinds?: ColumnKinds | undefined;
}

/**
 * Sorts rows by one column before they reach the tree core: the roots, and the children of
 * every row within their parent, so grouped rows stay grouped. The sort is stable. Present
 * values follow the column's comparator in the sort direction; missing values and values of
 * another type follow them in their original order. Returns the input when nothing sorts.
 */
export function getSortedRows<T>({
  roots,
  getChildren,
  columns,
  sort,
  kinds,
}: GetSortedRowsOptions<T>): SortedRows<T> {
  const column = sort === null ? undefined : columns.find((each) => each.id === sort.column);
  if (sort === null || column === undefined || !column.sortable) return { roots, getChildren };
  const kind = (kinds ?? inferKinds(roots, getChildren, columns)).get(column.id);
  const sign = sort.direction === "ascending" ? 1 : -1;
  const level = (items: readonly T[]): readonly T[] => {
    const decorated = items.map((item, index) => ({
      item,
      index,
      value: presentValue(column, kind, item),
    }));
    decorated.sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        if (a.value !== b.value) return a.value === undefined ? 1 : -1;
        return a.index - b.index;
      }
      return sign * column.compare(a.value, b.value) || a.index - b.index;
    });
    return decorated.map(({ item }) => item);
  };
  if (getChildren === undefined) return { roots: level(roots), getChildren };
  const sorted = new Map<T, readonly T[]>();
  walk(roots, getChildren, (item) => {
    const children = getChildren(item);
    if (Array.isArray(children)) sorted.set(item, level(children));
  });
  return {
    roots: level(roots),
    getChildren: (item) => (sorted.has(item) ? sorted.get(item) : getChildren(item)),
  };
}
