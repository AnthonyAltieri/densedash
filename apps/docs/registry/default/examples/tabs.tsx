import { useState } from "react";
import { Frame } from "../docs/frame.js";
import { Tabs } from "../ui/tabs.js";

const views = [
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
] as const;

export default function TabsExample() {
  const [view, setView] = useState<(typeof views)[number]["value"]>("positions");
  const tab = views.findIndex((item) => item.value === view) + 1;
  return (
    <Frame title="Trading views" count={`tab ${tab} of ${views.length}`} variant="tabs">
      <Tabs.Root items={views} label="Trading views" value={view} onValueChange={setView}>
        <Tabs.List />
        <Tabs.Panel value="positions">3 open positions. Net exposure 42,800.</Tabs.Panel>
        <Tabs.Panel value="orders">4 working orders. 2 awaiting review.</Tabs.Panel>
        <Tabs.Panel value="activity">Last fill: 120 AAPL at 227.48.</Tabs.Panel>
      </Tabs.Root>
    </Frame>
  );
}
