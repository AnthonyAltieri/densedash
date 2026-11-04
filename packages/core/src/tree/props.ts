import { move } from "../collections/move.js";
import type { Key, TreeRow } from "../collections/types.js";
import type { ClockPort } from "../ports/clock.js";
import type { TreeModel } from "./state.js";
import type {
  TreeCommands,
  TreePartProps,
  TreeRootProps,
  TreeRowProps,
  TreeToggleProps,
} from "./types.js";

export function createTreeProps<T>({
  model,
  commands,
  clock,
  id,
  mount,
}: {
  model: TreeModel<T>;
  commands: TreeCommands;
  clock: ClockPort;
  id: string;
  mount(root: HTMLElement): void;
}) {
  let root: HTMLElement | undefined;
  let text = "";
  let lastTyped = -Infinity;
  const rowId = (key: Key) =>
    `${id}-row-${Array.from(key, (character) => character.codePointAt(0)!.toString(16)).join("-")}`;
  const roving = () => model.options().focusStrategy === "roving";
  const mode = () => model.options().mode ?? "tree";
  const grid = () => mode() === "grid" || mode() === "treegrid";
  const slot = (part: "root" | "row" | "toggle"): TreePartProps["data-slot"] =>
    grid() ? `table-${part}` : `tree-${part}`;
  const rootSelector = () => `[data-slot="${slot("root")}"]`;
  // Prop getters run once per visible row, so look rows up by key in O(1) per snapshot.
  const indexes = new WeakMap<readonly TreeRow<T>[], Map<Key, TreeRow<T>>>();
  const current = (key: Key) => {
    const rows = model.get().rows;
    let index = indexes.get(rows);
    if (index === undefined) {
      index = new Map(rows.map((row) => [row.key, row]));
      indexes.set(rows, index);
    }
    return index.get(key);
  };
  const enabledHighlight = () => {
    const key = model.get().highlighted;
    const row = key === null ? undefined : current(key);
    return row?.disabled === false ? row : undefined;
  };
  const interactive = (key: Key) => model.active() && current(key)?.disabled === false;

  function focusHighlighted(): void {
    if (!model.active() || !roving() || !root?.contains(root.ownerDocument.activeElement)) return;
    const key = model.get().highlighted;
    const element = key === null ? null : root.ownerDocument.getElementById(rowId(key));
    if (element && root.contains(element) && element !== root.ownerDocument.activeElement)
      element.focus();
  }
  model.subscribe(focusHighlighted);

  function focusFromPointer(event: MouseEvent): void {
    const target = event.currentTarget;
    if (target && "closest" in target && typeof target.closest === "function") {
      const element = target.closest(rootSelector());
      if (element && "focus" in element) {
        root = element as HTMLElement;
        mount(root);
      }
    }
    if (!root) return;
    if (!roving() || !root.contains(root.ownerDocument.activeElement)) root.focus();
    focusHighlighted();
  }

  function part(slot: TreePartProps["data-slot"], row?: TreeRow<T>): TreePartProps {
    const state = model.get();
    const depth = row?.depth ?? 0;
    return {
      "data-slot": slot,
      "data-highlighted": (row ? state.highlighted === row.key : state.highlighted !== null)
        ? ""
        : undefined,
      "data-selected": (row ? state.selected.has(row.key) : state.selected.size > 0)
        ? ""
        : undefined,
      "data-expanded": (row ? row.expanded : state.expanded.size > 0) ? "" : undefined,
      "data-depth": depth,
      "data-disabled": row?.disabled ? "" : undefined,
      "data-leaf": row && !row.hasChildren ? "" : undefined,
      style: { "--dd-depth": depth },
    };
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (
      !model.active() ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.key.length !== 1 ||
      event.key.trim() === ""
    )
      return;
    const target = event.target;
    if (target && "closest" in target && typeof target.closest === "function") {
      if (
        target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      )
        return;
      if (target.closest(rootSelector()) !== event.currentTarget) return;
    }
    const at = clock.now();
    const character = event.key;
    // The keyboard port handles bubbling events first. A consumed preset key must not also type ahead.
    queueMicrotask(() => {
      if (!model.active() || event.defaultPrevented) return;
      text = at - lastTyped <= (model.options().typeaheadMs ?? 500) ? text + character : character;
      lastTyped = at;
      const state = model.get();
      const highlighted = move(
        state.rows,
        state.highlighted,
        { type: "typeahead", text },
        { loop: true },
      );
      model.change({ highlighted }, { reason: "typeahead", event });
    });
  }

  return {
    getRootProps(): TreeRootProps {
      const state = model.get();
      const highlighted = enabledHighlight();
      return {
        ...part(slot("root")),
        id,
        role: mode(),
        tabIndex: roving() && state.rows.some((row) => !row.disabled) ? -1 : 0,
        "aria-activedescendant": !roving() && highlighted ? rowId(highlighted.key) : undefined,
        "aria-multiselectable": model.options().selectionMode === "multiple",
        onKeyDown,
        onFocus(event) {
          if (!model.active()) return;
          const target = event.currentTarget;
          if (target && "ownerDocument" in target && "focus" in target) {
            root = target as HTMLElement;
            mount(root);
          }
          if (model.get().highlighted === null) commands.first();
          focusHighlighted();
        },
      };
    },
    getRowProps(key: Key): TreeRowProps {
      const state = model.get();
      const row = current(key);
      const rowMode = mode();
      // Flat grids have no levels, sets or expansion; their rows are plain grid rows.
      const leveled = rowMode === "tree" || rowMode === "treegrid";
      const focused =
        enabledHighlight()?.key ?? state.rows.find((candidate) => !candidate.disabled)?.key;
      return {
        ...part(slot("row"), row),
        id: rowId(key),
        role: rowMode === "listbox" ? "option" : grid() ? "row" : "treeitem",
        tabIndex: roving() && row && !row.disabled && focused === key ? 0 : -1,
        "aria-level": leveled && row ? row.depth + 1 : undefined,
        "aria-posinset": rowMode === "grid" ? undefined : row?.posInSet,
        "aria-setsize": rowMode === "grid" ? undefined : row?.setSize,
        "aria-rowindex": grid() && row ? row.index + 1 : undefined,
        "aria-expanded": leveled && row?.hasChildren ? row.expanded : undefined,
        "aria-selected": state.selected.has(key),
        "aria-disabled": row?.disabled ?? true,
        onPointerMove(event) {
          if (interactive(key) && !event.defaultPrevented && event.pointerType !== "touch")
            model.change({ highlighted: key }, { reason: "pointer", event });
        },
        onClick(event) {
          if (!interactive(key) || event.defaultPrevented) return;
          const before = model.get();
          model.change(
            {
              highlighted: key,
              ...(event.shiftKey && before.anchor === null ? { anchor: before.highlighted } : {}),
            },
            { reason: "pointer", event },
          );
          const action = { key, reason: "pointer" as const, event };
          if (event.shiftKey) commands.extendSelection(action);
          else commands.select(action);
          if (model.active()) focusFromPointer(event);
        },
        onDoubleClick(event) {
          if (interactive(key) && !event.defaultPrevented)
            commands.open({ key, reason: "pointer", event });
        },
        onFocus(event) {
          if (interactive(key) && roving())
            model.change({ highlighted: key }, { reason: "programmatic", event });
        },
      };
    },
    getToggleProps(key: Key): TreeToggleProps {
      const row = current(key);
      return {
        ...part(slot("toggle"), row),
        type: "button",
        tabIndex: -1,
        disabled: !row || row.disabled || !row.hasChildren,
        "aria-label": row?.expanded ? "Collapse" : "Expand",
        "aria-expanded": row?.hasChildren ? row.expanded : undefined,
        onClick(event) {
          if (!interactive(key) || !current(key)?.hasChildren || event.defaultPrevented) return;
          event.stopPropagation();
          commands.toggle({ key, reason: "pointer", event });
          if (model.active()) focusFromPointer(event);
        },
      };
    },
    dispose() {
      root = undefined;
      text = "";
    },
  };
}
