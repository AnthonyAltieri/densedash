import { useState } from "react";
import { Keymap, Tabs, useKernel } from "@densedash/react";

const blotterTabs = [
  { value: "orders", label: "Orders" },
  { value: "positions", label: "Positions" },
  { value: "fills", label: "Fills" },
  { value: "alerts", label: "Alerts", disabled: true },
] as const;

type BlotterTab = (typeof blotterTabs)[number]["value"];

const marketTabs = [
  { value: "chart", label: "Chart" },
  { value: "depth", label: "Depth" },
  { value: "trades", label: "Trades" },
] as const;

const accountTabs = [
  { value: "balances", label: "Balances" },
  { value: "margin", label: "Margin" },
  { value: "limits", label: "Limits" },
] as const;

/** Rebinds one tab command at runtime; the preset keeps every other key. */
function RebindButton() {
  const { commands } = useKernel();
  const [rebound, setRebound] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        commands.setOverrides(rebound ? {} : { "tabs.select.1": ["Q"] });
        setRebound(!rebound);
      }}
    >
      {rebound ? "Restore key 1 for the first tab" : "Rebind the first tab to Q"}
    </button>
  );
}

export function App() {
  const [blotter, setBlotter] = useState<BlotterTab>("orders");
  const [log, setLog] = useState("Click a tab group, then press 1–9, the arrow keys, Home or End.");
  const [rtl, setRtl] = useState(false);

  return (
    <Keymap.Scope name="page" page render={<main />}>
      <header>
        <h1>densedash tabs</h1>
        <p>{log}</p>
        <RebindButton />{" "}
        <button type="button" onClick={() => setRtl(!rtl)}>
          {rtl ? "Show left to right" : "Show right to left"}
        </button>
      </header>
      <div className="groups" dir={rtl ? "rtl" : "ltr"}>
        <section aria-label="Blotter">
          <h2>
            Blotter <span className="badge">controlled: {blotter}</span>
          </h2>
          <Tabs.Root
            items={blotterTabs}
            value={blotter}
            onValueChange={(value, details) => {
              setBlotter(value);
              setLog(`Blotter → ${value} (${details.reason})`);
            }}
            label="Blotter"
          >
            <Tabs.List />
            <Tabs.Panel value="orders">
              <p>Working orders.</p>
              <button type="button">Cancel all</button>
            </Tabs.Panel>
            <Tabs.Panel value="positions">
              <p>Open positions.</p>
            </Tabs.Panel>
            <Tabs.Panel value="fills">
              <p>Today's fills.</p>
            </Tabs.Panel>
            <Tabs.Panel value="alerts">
              <p>Alerts are disabled.</p>
            </Tabs.Panel>
          </Tabs.Root>
        </section>
        <section aria-label="Market">
          <h2>
            Market <span className="badge">uncontrolled</span>
          </h2>
          <Tabs.Root
            items={marketTabs}
            defaultValue="depth"
            onValueChange={(value, details) => setLog(`Market → ${value} (${details.reason})`)}
            label="Market"
          >
            <Tabs.List>
              {marketTabs.map((tab) => (
                <Tabs.Tab key={tab.value} value={tab.value} />
              ))}
            </Tabs.List>
            {marketTabs.map((tab) => (
              <Tabs.Panel key={tab.value} value={tab.value}>
                <p>{tab.label} for BTC-PERP.</p>
              </Tabs.Panel>
            ))}
            {/* A second view of the same tabs; its tab ids get their own prefix. */}
            <Tabs.List aria-label="Market, bottom" />
          </Tabs.Root>
        </section>
        <section aria-label="Account">
          <h2>
            Account <span className="badge">vertical</span>
          </h2>
          <Tabs.Root
            items={accountTabs}
            onValueChange={(value, details) => setLog(`Account → ${value} (${details.reason})`)}
            label="Account"
          >
            <Tabs.List orientation="vertical" />
            {accountTabs.map((tab) => (
              <Tabs.Panel key={tab.value} value={tab.value}>
                <p>{tab.label} for the trading account.</p>
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        </section>
      </div>
      <footer>
        <Keymap.Legend />
      </footer>
    </Keymap.Scope>
  );
}
