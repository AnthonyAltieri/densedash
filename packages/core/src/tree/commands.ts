import { move } from "../collections/move.js";
import { selectRange, toggleSelection } from "../collections/selection.js";
import type { Move } from "../collections/types.js";
import type { Command } from "../commands/types.js";
import { changeDetails } from "./state.js";
import type { TreeModel } from "./state.js";
import type { TreeAction, TreeCommands } from "./types.js";

export function createTreeCommands<T>(model: TreeModel<T>) {
  function target(action: TreeAction) {
    const state = model.get();
    const key = action.key ?? state.highlighted;
    return state.rows.find((row) => row.key === key && !row.disabled);
  }

  function navigate(movement: Move, action: TreeAction = {}): void {
    if (!model.active()) return;
    const state = model.get();
    const highlighted = move(state.rows, action.key ?? state.highlighted, movement, {
      loop: model.options().loop ?? false,
    });
    if (
      action.event &&
      "shiftKey" in action.event &&
      action.event.shiftKey &&
      model.options().selectionMode === "multiple" &&
      highlighted !== null
    ) {
      const anchor = state.anchor ?? state.highlighted ?? highlighted;
      model.change(
        { highlighted, anchor, selected: selectRange(state.rows, anchor, highlighted) },
        action,
      );
    } else model.change({ highlighted }, action);
  }

  function setExpanded(expanded: boolean, action: TreeAction = {}): void {
    if (!model.active()) return;
    const row = target(action);
    if (!row?.hasChildren) return;
    const next = new Set(model.get().expanded);
    if (expanded) next.add(row.key);
    else next.delete(row.key);
    model.change({ expanded: next }, action);
  }

  const commands: TreeCommands = {
    next: (action) => navigate({ type: "next" }, action),
    prev: (action) => navigate({ type: "prev" }, action),
    first: (action) => navigate({ type: "first" }, action),
    last: (action) => navigate({ type: "last" }, action),
    page: (direction, action) =>
      navigate({ type: "page", direction, size: model.options().pageSize ?? 10 }, action),
    parent: (action) => navigate({ type: "parent" }, action),
    expand(action = {}) {
      if (!model.active()) return;
      if (target(action)?.expanded) navigate({ type: "firstChild" }, action);
      else setExpanded(true, action);
    },
    collapse(action = {}) {
      if (!model.active()) return;
      if (target(action)?.expanded) setExpanded(false, action);
      else navigate({ type: "parent" }, action);
    },
    toggle(action = {}) {
      setExpanded(!target(action)?.expanded, action);
    },
    select(action = {}) {
      if (!model.active()) return;
      const row = target(action);
      if (!row) return;
      const selected =
        model.options().selectionMode === "multiple"
          ? toggleSelection(model.get().rows, model.get().selected, row.key)
          : new Set([row.key]);
      model.change({ selected, anchor: row.key }, action);
    },
    extendSelection(action = {}) {
      if (!model.active()) return;
      const row = target(action);
      if (!row) return;
      if (model.options().selectionMode !== "multiple") {
        commands.select(action);
        return;
      }
      const state = model.get();
      const anchor = state.anchor ?? state.highlighted ?? row.key;
      model.change({ anchor, selected: selectRange(state.rows, anchor, row.key) }, action);
    },
    open(action = {}) {
      if (!model.active()) return;
      const row = target(action);
      if (row) model.options().onOpen?.(row.item, changeDetails(action));
    },
  };

  function define(id: Command["id"], label: string, run: (action: TreeAction) => void): Command {
    return {
      id,
      label,
      run: ({ event }) => run(event ? { reason: "keyboard", event } : { reason: "programmatic" }),
    };
  }

  const definitions = [
    define("tree.next", "Next row", commands.next),
    define("tree.prev", "Previous row", commands.prev),
    define("tree.first", "First row", commands.first),
    define("tree.last", "Last row", commands.last),
    define("tree.page-up", "Previous page", (action) => commands.page(-1, action)),
    define("tree.page-down", "Next page", (action) => commands.page(1, action)),
    define("tree.parent", "Parent row", commands.parent),
    define("tree.expand", "Expand row", commands.expand),
    define("tree.collapse", "Collapse row", commands.collapse),
    define("tree.toggle", "Toggle expansion", commands.toggle),
    define("tree.select", "Select row", commands.select),
    define("tree.extend-selection", "Extend selection", commands.extendSelection),
    define("tree.open", "Open row", commands.open),
  ];
  return { commands, definitions };
}
