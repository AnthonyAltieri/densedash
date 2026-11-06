import type { KeyboardBinding } from "../ports/keyboard.js";
import { isKeyboardEditable } from "../ports/keyboard.js";
import type { createKeys } from "./keys.js";
import type { Command, CommandScopeOptions } from "./types.js";

export interface Scope {
  readonly name: string;
  readonly keys: ReturnType<typeof createKeys>;
  commands: readonly Command[];
  readonly options: CommandScopeOptions;
  readonly release: () => void;
  readonly unregister: () => void;
  readonly bindings: {
    readonly key: string;
    readonly commandIndex: number;
    readonly binding: KeyboardBinding;
    enabled: boolean;
  }[];
  readonly warned: Set<string>;
}

/** Scope-family ordering matches the port contract; no key matching happens here. */
export function activeScopes(scopes: ReadonlyMap<string, Scope>): Scope[] {
  function isDescendant(scope: Scope, ancestor: Scope): boolean {
    let parent = scope.options.parent ?? (scope.name === "global" ? undefined : "global");
    const visited = new Set<string>();
    while (parent !== undefined && !visited.has(parent)) {
      if (parent === ancestor.name) return true;
      visited.add(parent);
      parent = scopes.get(parent)?.options.parent;
    }
    return false;
  }

  const registered = Array.from(scopes.values());
  // Keep a scope family together even when a child mounts before its parent.
  const ranked = registered.map((scope, order) => {
    const earliest = registered.findIndex(
      (candidate) => candidate === scope || isDescendant(candidate, scope),
    );
    let depth = scope.name === "global" ? 0 : 1;
    let parent = scope.options.parent;
    const visited = new Set<string>();
    while (parent !== undefined && parent !== "global" && !visited.has(parent)) {
      visited.add(parent);
      depth++;
      parent = scopes.get(parent)?.options.parent;
    }
    return { scope, order, earliest, depth };
  });
  ranked.sort((a, b) => b.earliest - a.earliest || b.depth - a.depth || b.order - a.order);
  const ordered = ranked.map(({ scope }) => scope);
  const global = ordered.findIndex((scope) => scope.name === "global");
  if (global >= 0) ordered.push(...ordered.splice(global, 1));
  const exclusive = ordered.find((scope) => scope.options.only);
  const active = exclusive
    ? ordered.filter((scope) => scope === exclusive || isDescendant(scope, exclusive))
    : ordered;
  return [
    ...active.filter((scope) => scope.options.keys),
    ...active.filter((scope) => !scope.options.keys),
  ];
}

/** Element targets participate only while focus is inside them; document/window targets are ambient. */
export function scopeHasFocus(scope: Scope): boolean {
  const target = scope.options.target;
  return (
    scope.options.keys !== undefined ||
    !target ||
    !("ownerDocument" in target) ||
    target.ownerDocument === null ||
    target.contains(target.ownerDocument?.activeElement ?? null)
  );
}

/** Editable-only command bindings are disabled while a text control has focus. */
export function scopeAcceptsKeys(scope: Scope): boolean {
  if (!scopeHasFocus(scope)) return false;
  if (!scope.options.keys && (scope.options.ignoreInputs ?? "editable") !== "editable") return true;
  const target = scope.options.target;
  const document =
    target && "document" in target
      ? target.document
      : target && "defaultView" in target
        ? target
        : (target?.ownerDocument ?? globalThis.document);
  return !isKeyboardEditable(document?.activeElement);
}

/** Element listeners see bubbling keys before ambient listeners, regardless of scope age. */
export function keymapScopes(scopes: ReadonlyMap<string, Scope>): Scope[] {
  return activeScopes(scopes)
    .filter(scopeAcceptsKeys)
    .sort((a, b) => {
      if (Boolean(a.options.keys) !== Boolean(b.options.keys)) return a.options.keys ? -1 : 1;
      if (a.options.keys && b.options.keys) return 0;
      const aTarget = a.options.target;
      const bTarget = b.options.target;
      const aElement =
        aTarget && "ownerDocument" in aTarget && aTarget.ownerDocument ? aTarget : undefined;
      const bElement =
        bTarget && "ownerDocument" in bTarget && bTarget.ownerDocument ? bTarget : undefined;
      if (aElement && bElement) {
        if (aElement === bElement) return 0;
        if (aElement.contains(bElement)) return 1;
        if (bElement.contains(aElement)) return -1;
      }
      return Number(Boolean(bElement)) - Number(Boolean(aElement));
    });
}
