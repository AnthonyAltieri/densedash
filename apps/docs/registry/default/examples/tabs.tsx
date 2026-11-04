import { Keymap } from "../ui/keymap.js";
import { Tabs } from "../ui/tabs.js";

const items = [
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
] as const;

export default function TabsExample() {
  return (
    <Keymap.Provider>
      <Tabs.Root items={items} label="Trading views" defaultValue="positions">
        <Tabs.List />
        <Tabs.Panel value="positions">3 open positions · Net exposure 42,800</Tabs.Panel>
        <Tabs.Panel value="orders">4 working orders · 2 awaiting review</Tabs.Panel>
        <Tabs.Panel value="activity">Last fill: AAPL · 120 shares</Tabs.Panel>
      </Tabs.Root>
    </Keymap.Provider>
  );
}
