import { useState } from "react";
import type { ReactNode } from "react";
import { Kbd, Keymap, useCommands } from "@densedash/react";
import { preset } from "./preset.ts";

type View = "inbox" | "starred" | "archive";

interface Message {
  readonly id: number;
  readonly from: string;
  readonly subject: string;
  readonly starred: boolean;
}

const initialMessages: readonly Message[] = [
  { id: 1, from: "Ada", subject: "Ledger reconciliation", starred: false },
  { id: 2, from: "Grace", subject: "Deploy window moved", starred: true },
  { id: 3, from: "Linus", subject: "Patch review", starred: false },
  { id: 4, from: "Barbara", subject: "Quarterly numbers", starred: false },
];

function Pane({ name, title, children }: { name: string; title: string; children: ReactNode }) {
  return (
    <Keymap.Scope
      name={name}
      render={(props, state) => (
        <section {...props} aria-label={title}>
          <h2>
            {title} <span className="badge">{state.active ? "active" : "inactive"}</span>
          </h2>
          {props.children}
        </section>
      )}
      className={(state) => (state.active ? "pane pane-active" : "pane")}
    >
      {children}
    </Keymap.Scope>
  );
}

function Navigation({ onNavigate }: { onNavigate: (view: View) => void }) {
  useCommands([
    { id: "go-inbox", label: "Inbox", group: "Go to", run: () => onNavigate("inbox") },
    { id: "go-starred", label: "Starred", group: "Go to", run: () => onNavigate("starred") },
    { id: "go-archive", label: "Archive", group: "Go to", run: () => onNavigate("archive") },
  ]);
  return null;
}

function MessageList({
  messages,
  selected,
  onSelect,
  onStar,
  onDelete,
}: {
  messages: readonly Message[];
  selected: number;
  onSelect: (index: number) => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  useCommands([
    {
      id: "next",
      label: "Next message",
      group: "Messages",
      run: () => onSelect(Math.min(selected + 1, messages.length - 1)),
    },
    {
      id: "previous",
      label: "Previous message",
      group: "Messages",
      run: () => onSelect(Math.max(selected - 1, 0)),
    },
    { id: "star", label: "Star", group: "Messages", run: onStar },
    {
      id: "delete",
      label: "Delete",
      group: "Messages",
      enabled: () => messages.length > 0,
      confirm: { prompt: "Delete the selected message?" },
      run: onDelete,
    },
  ]);
  return (
    <ul className="messages">
      {messages.map((message, index) => (
        <li
          key={message.id}
          data-selected={index === selected ? "" : undefined}
          onClick={() => onSelect(index)}
        >
          <span>{message.starred ? "★" : "☆"}</span> <strong>{message.from}</strong>{" "}
          {message.subject}
        </li>
      ))}
    </ul>
  );
}

function MessageDetails({
  message,
  onLog,
}: {
  message: Message | undefined;
  onLog: (text: string) => void;
}) {
  useCommands([
    {
      id: "reply",
      label: "Reply",
      group: "Message",
      run: () => onLog(`Reply to ${message?.from}`),
    },
    {
      id: "archive",
      label: "Archive",
      group: "Message",
      run: () => onLog(`Archived ${message?.subject}`),
    },
  ]);
  return message === undefined ? <p>No message.</p> : <p>{message.subject}</p>;
}

export function App() {
  const [view, setView] = useState<View>("inbox");
  const [messages, setMessages] = useState(initialMessages);
  const [selected, setSelected] = useState(0);
  const [details, setDetails] = useState(true);
  const [log, setLog] = useState("Click a pane, then press keys.");
  const visible = view === "starred" ? messages.filter((message) => message.starred) : messages;
  const current = visible[selected];

  return (
    <Keymap.Scope name="page" page render={<main />}>
      <Navigation
        onNavigate={(next) => {
          setView(next);
          setSelected(0);
          setLog(`Went to ${next}`);
        }}
      />
      <header>
        <h1>densedash keymap</h1>
        <p>
          View: <strong>{view}</strong> · {log} · Press <Kbd hotkey={preset["go-inbox"][0]} /> for
          the inbox.
        </p>
        <button type="button" onClick={() => setDetails((shown) => !shown)}>
          {details ? "Unmount" : "Mount"} the details pane
        </button>
      </header>
      <Keymap.ConfirmPrompt />
      <div className="panes">
        <Pane name="list" title="Messages">
          <MessageList
            messages={visible}
            selected={selected}
            onSelect={setSelected}
            onStar={() =>
              setMessages((all) =>
                all.map((message) =>
                  message.id === current?.id ? { ...message, starred: !message.starred } : message,
                ),
              )
            }
            onDelete={() => {
              setMessages((all) => all.filter((message) => message.id !== current?.id));
              setSelected((index) => Math.max(0, Math.min(index, visible.length - 2)));
              setLog(`Deleted ${current?.subject}`);
            }}
          />
        </Pane>
        {details ? (
          <Pane name="details" title="Details">
            <MessageDetails message={current} onLog={setLog} />
          </Pane>
        ) : null}
      </div>
      <footer>
        <Keymap.Legend />
      </footer>
      <Keymap.ChordHint />
    </Keymap.Scope>
  );
}
