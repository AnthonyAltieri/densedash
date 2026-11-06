import type { RowData } from "@tanstack/table-core";
import { move } from "./move.js";
import { selectRange } from "./selection.js";
import type { Move } from "../collections/types.js";
import type { Command } from "../commands/types.js";
import { changeDetails, keyState } from "./state.js";
import type { NavigationModel } from "./state.js";
import type { TreeAction } from "../tree/types.js";
import type { NavigationCommands } from "./types.js";

export function createNavigationCommands<T extends RowData>(model: NavigationModel<T>) {
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
    const engineRow = model.table.getRow(row.key);
    if (engineRow.getIsExpanded() === expanded) return;
    model.run(action, () => engineRow.toggleExpanded(expanded));
  }

  const commands: NavigationCommands = {
    next: (action) => navigate({ type: "next" }, action),
    prev: (action) => navigate({ type: "prev" }, action),
    first: (action) => navigate({ type: "first" }, action),
    last: (action) => navigate({ type: "last" }, action),
    page: (direction, action) =>
      navigate({ type: "page", direction, size: model.options().pageSize ?? 10 }, action),
    parent: (action) => navigate({ type: "parent" }, action),
    expand(action = {}) {
      if (!model.active()) return;
      setExpanded(true, action);
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
      model.run(action, () => {
        model.change({ anchor: row.key }, action);
        const engineRow = model.table.getRow(row.key);
        engineRow.toggleSelected(
          model.options().selectionMode === "multiple" ? !engineRow.getIsSelected() : true,
          { selectChildren: false },
        );
      });
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
      model.run(action, () => {
        model.change({ anchor }, action);
        model.table.setRowSelection(keyState(selectRange(state.rows, anchor, row.key)));
      });
    },
    sort(column, action = {}) {
      if (!model.active()) return;
      const sortable = model.table.getAllLeafColumns().filter((each) => each.getCanSort());
      const id =
        column ??
        model.state.get().chosenColumn ??
        model.state.get().sorting[0]?.id ??
        sortable[0]?.id;
      const chosen = sortable.find((each) => each.id === id);
      if (!chosen) return;
      // Ascending, descending, unsorted; a `sortDescFirst` column starts descending.
      const first = chosen.columnDef.sortDescFirst === true;
      model.run(action, () => {
        model.request("chosenColumn", chosen.id);
        const sorted = model.state.get().sorting[0];
        model.table.setSorting(
          sorted?.id !== chosen.id
            ? [{ id: chosen.id, desc: first }]
            : sorted.desc !== first
              ? []
              : [{ id: chosen.id, desc: !first }],
        );
      });
    },
    chooseColumn(direction = 1, action = {}) {
      if (!model.active()) return;
      const columns = model.table.getAllLeafColumns().filter((each) => each.getCanSort());
      if (!columns.length) return;
      const state = model.state.get();
      const current = state.chosenColumn ?? state.sorting[0]?.id ?? columns[0]!.id;
      const index = columns.findIndex((each) => each.id === current);
      const chosen = columns[(index + direction + columns.length) % columns.length]!;
      model.run(action, () => {
        model.request("chosenColumn", chosen.id);
        if (state.sorting.length)
          model.table.setSorting([{ id: chosen.id, desc: state.sorting[0]!.desc }]);
      });
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
    define("table.sort", "Sort column", (action) => commands.sort(undefined, action)),
    define("table.next-column", "Next sort column", (action) => commands.chooseColumn(1, action)),
  ];
  return { commands, definitions };
}
