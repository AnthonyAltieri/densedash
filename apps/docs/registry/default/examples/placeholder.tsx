import { useState } from "react";

export default function Placeholder() {
  const [connected, setConnected] = useState(false);
  const status = connected ? "Connected" : "Ready";

  return (
    <button
      type="button"
      data-slot="placeholder"
      data-state={connected ? "connected" : "ready"}
      aria-pressed={connected}
      onClick={() => setConnected(!connected)}
    >
      <span data-slot="status-dot" aria-hidden="true" />
      <span>{status}</span>
      <span data-slot="placeholder-action">{connected ? "Disconnect" : "Connect"} ↗</span>
    </button>
  );
}
