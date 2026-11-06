import { useState } from "react";
import type { KeysOptions } from "@densedash/core";
import { Cell } from "../docs/cell.js";
import { Frame } from "../docs/frame.js";
import { Kbd } from "../ui/kbd.js";
import { Keymap, useCommands, useKernel } from "../ui/keymap.js";

const keys = {
  preset: {
    "order.approve": ["A"],
    "order.reject": ["X"],
    confirm: ["Enter"],
    cancel: ["Escape"],
  },
} satisfies KeysOptions;

const stages = {
  review: {
    label: "In review",
    note: "Press a to approve or x to reject. Nothing runs until you confirm.",
  },
  approved: { label: "Approved", note: "Order approved and sent to the venue." },
  rejected: { label: "Rejected", note: "Order rejected. The desk has been told." },
};

type Stage = keyof typeof stages;

function OrderSummary({ stage, onStage }: { stage: Stage; onStage: (stage: Stage) => void }) {
  const { commands } = useKernel();
  const inReview = () => stage === "review";
  useCommands([
    {
      id: "order.approve",
      label: "Approve",
      enabled: inReview,
      confirm: { prompt: "Approve this order?" },
      run: () => onStage("approved"),
    },
    {
      id: "order.reject",
      label: "Reject",
      enabled: inReview,
      confirm: { prompt: "Reject this order?" },
      run: () => onStage("rejected"),
    },
  ]);
  return (
    <>
      <div data-slot="order" data-stage={stage}>
        <Cell.Name>Sell 300 NVDA at 138.50</Cell.Name>
        <Cell.Note>Placed by the equities desk, 6 minutes ago. Value 41,550.</Cell.Note>
        <button type="button" onClick={() => commands.invoke("order.approve")}>
          Approve <Kbd hotkey={keys.preset["order.approve"][0]} />
        </button>
        <button type="button" data-tone="negative" onClick={() => commands.invoke("order.reject")}>
          Reject <Kbd hotkey={keys.preset["order.reject"][0]} />
        </button>
        <button type="button" data-tone="quiet" onClick={() => onStage("review")}>
          Reset
        </button>
      </div>
      <div data-slot="order-prompt">
        <Cell.Note>{stages[stage].note}</Cell.Note>
        <Keymap.ConfirmPrompt />
      </div>
    </>
  );
}

export default function KeymapConfirmExample() {
  const [stage, setStage] = useState<Stage>("review");
  return (
    <Frame
      title="Order awaiting review"
      count={stages[stage].label}
      footer={false}
      variant="keymap-confirm"
    >
      <Keymap.Provider keys={keys}>
        <Keymap.Scope name="order" aria-label="Order awaiting review">
          <OrderSummary stage={stage} onStage={setStage} />
        </Keymap.Scope>
      </Keymap.Provider>
    </Frame>
  );
}
