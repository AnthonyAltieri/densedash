import { useContext, useId, useLayoutEffect, useRef } from "react";
import type { Command, CommandScopeOptions } from "@densedash/core";
import { useKernelFor } from "./context.js";
import { ScopeContext } from "./scope-context.js";

/** Scope options for `useCommands`; the nearest `<Keymap.Scope>` supplies parent and target. */
export type UseCommandsOptions = Pick<CommandScopeOptions, "ignoreInputs" | "timeout" | "only">;

type Latest = { current: readonly Command[] };

// Only these fields reach the keymap or bindings; handlers are read through the latest ref.
function signature(commands: readonly Command[]): string {
  return JSON.stringify(
    commands.map((command) => [
      command.id,
      command.label,
      command.group ?? null,
      command.hidden ?? false,
      command.confirm?.prompt ?? null,
    ]),
  );
}

function delegate(command: Command, latest: Latest): Command {
  const current = () => latest.current.find((candidate) => candidate.id === command.id) ?? command;
  return {
    id: command.id,
    label: command.label,
    ...(command.group === undefined ? {} : { group: command.group }),
    ...(command.hidden === undefined ? {} : { hidden: command.hidden }),
    ...(command.confirm === undefined ? {} : { confirm: { prompt: command.confirm.prompt } }),
    enabled: () => current().enabled?.() ?? true,
    run: (context) => current().run(context),
  };
}

/**
 * Registers commands for the life of the component, in a scope of their own nested in the
 * nearest `<Keymap.Scope>` (or under `global` outside one). Registration happens in a layout
 * effect and is removed in its cleanup, so StrictMode's double mount leaves one registration.
 * `run` and `enabled` always call the latest render's functions. Changing ids, labels, groups,
 * `hidden` or confirm prompts re-registers the scope, which cancels its pending confirmation and
 * sequence progress; keep those values stable while a confirmation can be open.
 */
export function useCommands(commands: readonly Command[], options: UseCommandsOptions = {}): void {
  const kernel = useKernelFor("useCommands()");
  const scope = useContext(ScopeContext);
  const id = useId();
  const latest = useRef(commands);
  const key = signature(commands);
  const parent = scope?.name;
  const element = scope?.element;
  const { ignoreInputs, timeout, only } = options;

  useLayoutEffect(() => {
    latest.current = commands;
  });

  useLayoutEffect(() => {
    // Inside a scope, wait for its element so bindings target it rather than the document.
    if (element === null) return;
    const name = parent === undefined ? `densedash${id}` : `${parent}/${id}`;
    return kernel.commands.register(
      name,
      latest.current.map((command) => delegate(command, latest)),
      {
        ...(parent === undefined ? {} : { parent }),
        ...(element === undefined ? {} : { target: element }),
        ...(ignoreInputs === undefined ? {} : { ignoreInputs }),
        ...(timeout === undefined ? {} : { timeout }),
        ...(only === undefined ? {} : { only }),
      },
    );
  }, [kernel, id, parent, element, key, ignoreInputs, timeout, only]);
}
