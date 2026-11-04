import type { KeyboardBinding } from "../ports/keyboard.js";
import type { Command, CommandScopeOptions } from "./types.js";

export interface Scope {
  readonly name: string;
  readonly commands: readonly Command[];
  readonly options: CommandScopeOptions;
  readonly release: () => void;
  readonly unregister: () => void;
  readonly bindings: KeyboardBinding[];
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
  return exclusive
    ? ordered.filter((scope) => scope === exclusive || isDescendant(scope, exclusive))
    : ordered;
}

/** Element targets participate only while focus is inside them; document/window targets are ambient. */
export function scopeHasFocus(scope: Scope): boolean {
  const target = scope.options.target;
  return (
    !target ||
    !("ownerDocument" in target) ||
    target.ownerDocument === null ||
    target.contains(target.ownerDocument?.activeElement ?? null)
  );
}
