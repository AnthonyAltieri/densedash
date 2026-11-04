import type { Ports } from "../kernel.js";
import type { KeyboardBinding } from "../ports/keyboard.js";
import { createKeys, keyIdentity } from "./keys.js";
import { activeScopes, scopeHasFocus } from "./scopes.js";
import type { Scope } from "./scopes.js";
import type {
  Command,
  CommandContext,
  Commands,
  KeymapEntry,
  KeysOptions,
  PendingConfirm,
} from "./types.js";

export type {
  Command,
  CommandContext,
  CommandId,
  Commands,
  CommandScopeOptions,
  KeymapEntry,
  KeyOverrideId,
  KeyOverrides,
  KeysOptions,
  PendingConfirm,
  Preset,
  Register,
  ValidatedKeyOverrides,
} from "./types.js";
export { tradingPreset } from "./trading-preset.js";

let nextConfirmScope = 0;

/** Only port interfaces enter this owner; bare and default kernels share the same layer. */
export function createCommands({
  ports: { keyboard, store, reporter },
  keys: options = {},
}: {
  ports: Pick<Ports, "keyboard" | "store" | "reporter">;
  keys?: KeysOptions;
}): Commands {
  const keys = createKeys({ keyboard, reporter, options });
  const keymap = store.create<readonly KeymapEntry[]>([]);
  const confirm = store.create<PendingConfirm | null>(null);
  const scopes = new Map<string, Scope>();
  const confirmScope = `densedash:confirm:${nextConfirmScope++}`;
  let pending: {
    scope: Scope;
    command: Command;
    context: CommandContext;
    release: () => void;
  } | null = null;
  let disposed = false;

  function publishKeymap(): void {
    const entries: KeymapEntry[] = [];
    const claimed = new Set<string>();
    for (const scope of pending ? [] : activeScopes(scopes).filter(scopeHasFocus)) {
      for (const command of scope.commands) {
        const available = keys.get(command.id).filter((key) => {
          const identity = keyIdentity(key);
          if (claimed.has(identity)) return false;
          claimed.add(identity);
          return true;
        });
        if (command.hidden || (keys.get(command.id).length > 0 && available.length === 0)) continue;
        entries.push({
          command: command.id,
          label: command.label,
          scope: scope.name,
          ...(command.group === undefined ? {} : { group: command.group }),
          keys: available.map((key) => keyboard.format(key)),
        });
      }
    }
    if (pending) {
      entries.push({
        command: "confirm",
        label: "Confirm",
        scope: confirmScope,
        keys: keys.get("confirm").map((key) => keyboard.format(key)),
      });
      entries.push({
        command: "cancel",
        label: "Cancel",
        scope: confirmScope,
        keys: keys.get("cancel").map((key) => keyboard.format(key)),
      });
    }
    keymap.set(entries);
  }

  function cancel(): void {
    if (!pending) return;
    const captured = pending;
    pending = null;
    captured.release();
    store.batch(() => {
      confirm.set(null);
      publishKeymap();
    });
  }

  function run(command: Command, context: CommandContext): void {
    try {
      if (command.enabled?.() === false) return;
      const result = reporter.trace
        ? reporter.trace(command.id, () => command.run(context))
        : command.run(context);
      if (result !== undefined) {
        void Promise.resolve(result).catch((cause: unknown) =>
          reporter.error(cause, { source: "command", id: command.id }),
        );
      }
    } catch (cause) {
      reporter.error(cause, { source: "command", id: command.id });
    }
  }

  function accept(): void {
    const captured = pending;
    if (!captured) return;
    cancel();
    if (scopes.get(captured.scope.name) === captured.scope && !disposed) {
      run(captured.command, captured.context);
    }
  }

  function invokeOwned(scope: Scope, command: Command, context: CommandContext): void {
    if (disposed || pending || scopes.get(scope.name) !== scope) return;
    try {
      if (!command.confirm) {
        run(command, context);
        return;
      }
      if (command.enabled?.() === false) return;
      const prompt = command.confirm.prompt;
      const bindings: KeyboardBinding[] = [];
      const release = keyboard.activateScope(confirmScope, { exclusive: true });
      const releaseConfirm = () => {
        for (const binding of bindings) binding.dispose();
        release();
      };
      try {
        for (const key of keys.get("confirm")) {
          bindings.push(
            keyboard.bind(
              key,
              (event) => {
                if (!event.repeat) accept();
              },
              { scope: confirmScope, ignoreInputs: false },
            ),
          );
        }
        for (const key of keys.get("cancel")) {
          bindings.push(keyboard.bind(key, cancel, { scope: confirmScope, ignoreInputs: false }));
        }
      } catch (cause) {
        releaseConfirm();
        throw cause;
      }
      pending = {
        scope,
        command,
        context,
        release: releaseConfirm,
      };
      store.batch(() => {
        confirm.set({ command: command.id, label: command.label, prompt, scope: scope.name });
        publishKeymap();
      });
    } catch (cause) {
      reporter.error(cause, { source: "command", id: command.id });
    }
  }

  function bindScope(scope: Scope): void {
    for (const binding of scope.bindings) binding.dispose();
    scope.bindings.length = 0;
    const owners = new Map<string, Command>();
    for (const command of scope.commands) {
      for (const key of keys.get(command.id)) {
        const identity = keyIdentity(key);
        const owner = owners.get(identity);
        if (owner) {
          const warning = JSON.stringify([identity, owner.id, command.id]);
          if (owner.id !== command.id && !scope.warned.has(warning)) {
            scope.warned.add(warning);
            reporter.warn(
              `Commands "${owner.id}" and "${command.id}" share ${keyboard.format(key)} in scope "${scope.name}"; "${owner.id}" keeps the key.`,
            );
          }
          continue;
        }
        owners.set(identity, command);
        const { parent: _parent, only: _only, ...bindingOptions } = scope.options;
        scope.bindings.push(
          keyboard.bind(
            key,
            (event) => {
              if (!event.repeat || !command.confirm) invokeOwned(scope, command, { event });
            },
            { ...bindingOptions, scope: scope.name },
          ),
        );
      }
    }
  }

  return {
    register(name, commands, scopeOptions = {}) {
      if (disposed) throw new Error("Commands have been disposed.");
      if (name === "global" && scopeOptions.only)
        throw new Error("The global scope cannot be exclusive. Use a named layer.");
      if (scopes.has(name) || name === confirmScope)
        throw new Error(`Command scope "${name}" already has an owner.`);
      const release = keyboard.activateScope(name, {
        ...(scopeOptions.parent === undefined ? {} : { parent: scopeOptions.parent }),
        exclusive: scopeOptions.only ?? false,
      });
      const target = scopeOptions.target;
      const focusDocument = target && "ownerDocument" in target ? target.ownerDocument : undefined;
      const onFocus = () => publishKeymap();
      focusDocument?.addEventListener("focusin", onFocus, true);
      focusDocument?.addEventListener("focusout", onFocus, true);
      const scope: Scope = {
        name,
        commands: [...commands],
        options: { ...scopeOptions },
        release() {
          focusDocument?.removeEventListener("focusin", onFocus, true);
          focusDocument?.removeEventListener("focusout", onFocus, true);
          release();
        },
        bindings: [],
        warned: new Set(),
        unregister() {
          if (scopes.get(name) !== scope) return;
          scopes.delete(name);
          for (const binding of scope.bindings) binding.dispose();
          scope.release();
          if (pending?.scope === scope) cancel();
          else publishKeymap();
        },
      };
      scopes.set(name, scope);
      try {
        bindScope(scope);
        publishKeymap();
      } catch (cause) {
        scope.unregister();
        throw cause;
      }
      return scope.unregister;
    },
    invoke(id, context = {}) {
      if (disposed || pending) return;
      for (const scope of activeScopes(scopes)) {
        if (context.scope !== undefined && context.scope !== scope.name) continue;
        if (!scopeHasFocus(scope)) continue;
        const command = scope.commands.find((candidate) => candidate.id === id);
        if (command) {
          invokeOwned(scope, command, context);
          return;
        }
      }
    },
    keymap: { get: () => keymap.get(), subscribe: (listener) => keymap.subscribe(listener) },
    confirm: { get: () => confirm.get(), subscribe: (listener) => confirm.subscribe(listener) },
    accept,
    cancel,
    setOverrides(overrides) {
      if (disposed) return;
      const validated = keys.replace(overrides);
      store.batch(() => {
        cancel();
        for (const scope of scopes.values()) bindScope(scope);
        publishKeymap();
      });
      options.onChange?.(validated);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      store.batch(() => {
        cancel();
        for (const scope of scopes.values()) scope.unregister();
      });
    },
  };
}
