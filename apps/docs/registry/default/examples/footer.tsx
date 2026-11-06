import { useState } from "react";
import { desks } from "../docs/data.js";
import { Frame } from "../docs/frame.js";
import { Footer } from "../ui/footer.js";
import { Tabs } from "../ui/tabs.js";
import { Tree, useTree } from "../ui/tree.js";

const views = [
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
] as const;

function Desks({ onOpen }: { onOpen: (name: string) => void }) {
  const tree = useTree({
    data: desks.slice(0, 3),
    getRowId: (desk) => desk.id,
    getTextValue: (desk) => desk.name,
    onOpen: (desk) => onOpen(desk.name),
  });
  return (
    <Tree.Root tree={tree} aria-label="Desks">
      <Tree.Viewport tree={tree}>
        {(row) => <Tree.Row row={row}>{row.original.name}</Tree.Row>}
      </Tree.Viewport>
    </Tree.Root>
  );
}

function DetailTabs() {
  return (
    <Tabs.Root items={views} label="detail tabs">
      <Tabs.List />
    </Tabs.Root>
  );
}

// The legend keeps no key list of its own. It reads the keymap,
// so it shows only the keys that answer where focus is.
export default function FooterExample() {
  const [status, setStatus] = useState("updated 09:41");
  return (
    <Frame title="Footer" footer={false} variant="footer">
      <Desks onOpen={(name) => setStatus(`opened ${name}`)} />
      <DetailTabs />
      <Footer.Root>
        <Footer.Legend />
        <Footer.Status>{status}</Footer.Status>
      </Footer.Root>
    </Frame>
  );
}
