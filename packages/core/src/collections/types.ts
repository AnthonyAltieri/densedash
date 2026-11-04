export type Key = string;

/** Callbacks must be synchronous and stable for the duration of a call. */
export interface TreeSource<T> {
  roots: readonly T[];
  getKey(item: NoInfer<T>): Key;
  getChildren?(item: NoInfer<T>): readonly NoInfer<T>[] | undefined;
  isDisabled?(item: NoInfer<T>): boolean;
  getTextValue?(item: NoInfer<T>): string;
}

export interface TreeRow<T> {
  readonly key: Key;
  readonly item: T;
  readonly index: number;
  readonly depth: number;
  readonly parentKey: Key | null;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly posInSet: number;
  readonly setSize: number;
  readonly disabled: boolean;
  readonly textValue: string;
}

export interface TreeState {
  highlighted: Key | null;
  selected: ReadonlySet<Key>;
  anchor: Key | null;
  expanded: ReadonlySet<Key>;
}

export type Move =
  | { type: "next" | "prev"; count?: number }
  | { type: "first" | "last" }
  | { type: "parent" | "firstChild" }
  | { type: "page"; direction: 1 | -1; size: number }
  | { type: "typeahead"; text: string };

export interface MoveOptions {
  /** Wrap next, prev, page and typeahead at the ends. Defaults to false. */
  loop?: boolean;
}
