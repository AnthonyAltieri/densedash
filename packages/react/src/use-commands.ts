import { useContext, useId, useLayoutEffect, useRef } from "react";
import type { Command, CommandScopeOptions } from "@densedash/core";
import { useKernelFor } from "./context.js";
import { ScopeContext } from "./scope-context.js";

/** Scope options for `useCommands`; the nearest `<Keymap.Scope>` supplies parent and target. */
export type UseCommandsOptions = Pick<CommandScopeOptions, "ignoreInputs" | "timeout" | "only">;

/**
 * Registers commands for the life of the component, in a scope of their own nested in the
 * nearest `<Keymap.Scope>` (or under `global` outside one). Registration happens in a layout
 * effect and is removed in its cleanup, so StrictMode's double mount leaves one registration.
 * Definitions update after each render without rebinding, preserving pending confirmation and
 * sequence progress. Only changing ordered ids or scope options re-registers the scope.
 */
export function useCommands(commands: readonly Command[], options: UseCommandsOptions = {}): void {
  const kernel = useKernelFor("useCommands()");
  const scope = useContext(ScopeContext);
  const id = useId();
  const latest = useRef(commands);
  const key = JSON.stringify(commands.map((command) => command.id));
  const parent = scope?.name;
  const element = scope?.element;
  const { ignoreInputs, timeout, only } = options;
  const name = parent === undefined ? `densedash${id}` : `${parent}/${id}`;

  useLayoutEffect(() => {
    latest.current = commands;
  });

  useLayoutEffect(() => {
    // Inside a scope, wait for its element so bindings target it rather than the document.
    if (element === null) return;
    return kernel.commands.register(name, latest.current, {
      ...(parent === undefined ? {} : { parent }),
      ...(element === undefined ? {} : { target: element }),
      ...(ignoreInputs === undefined ? {} : { ignoreInputs }),
      ...(timeout === undefined ? {} : { timeout }),
      ...(only === undefined ? {} : { only }),
    });
  }, [kernel, name, parent, element, key, ignoreInputs, timeout, only]);

  useLayoutEffect(() => {
    if (element !== null) kernel.commands.update(name, commands);
  });
}
