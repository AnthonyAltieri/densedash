import type { CSSProperties } from "react";
import { Keymap } from "../ui/keymap.js";
import { List, useList } from "../ui/list.js";

const items = [
  { id: "live", label: "Live orders" },
  { id: "settled", label: "Settled orders" },
];
const style: CSSProperties & Record<`--dd-${string}`, string> = {
  "--dd-color-highlight": "var(--dd-color-selection)",
  "--dd-color-text": "var(--dd-color-accent)",
  "--dd-row-height": "calc(var(--dd-control-height) * 2)",
  "--dd-font-sans": "var(--dd-font-mono)",
};

function Orders({ restyled }: { restyled: boolean }) {
  const list = useList({ data: items, getRowId: (item) => item.id });
  return (
    <div style={restyled ? style : undefined}>
      <p>{restyled ? "Variable overrides" : "Default tokens"}</p>
      <List.Root tree={list} aria-label={restyled ? "Restyled orders" : "Default orders"}>
        <List.Viewport tree={list}>
          {(row) => <List.Row row={row}>{row.original.label}</List.Row>}
        </List.Viewport>
      </List.Root>
    </div>
  );
}

export default function ThemeExample() {
  return (
    <Keymap.Provider>
      <div data-slot="example-stack">
        <Orders restyled={false} />
        <Orders restyled />
      </div>
    </Keymap.Provider>
  );
}
