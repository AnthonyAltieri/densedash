# Commands

Commands define actions; presets and overrides choose their keys. Each registered scope owns
its keyboard bindings and focus listeners until its unregister function runs.

```ts
const unregister = kernel.commands.register("orders", [
  { id: "approve", label: "Approve order", run: approveOrder },
]);

kernel.commands.update("orders", [
  { id: "approve", label: "Approve selected order", run: approveSelectedOrder },
]);

unregister();
```

`update(scope, commands)` replaces definitions in place, including labels, groups, `hidden`,
confirmation prompts, `enabled` predicates and handlers. It requires the same command ids in
the same order; changing membership, order or scope options requires unregistering first.
Updates leave the scope's bindings and sequence progress intact. A pending confirmation keeps
its original keyboard event, uses the latest handler and enabled predicate, and refreshes its
label and prompt. Removing `confirm` from the definition leaves an existing prompt pending
until accepted or canceled. Updating an unknown scope throws; updates after disposal do nothing.

`commands.keymap` exposes formatted keys and the evaluated `enabled` flag. Predicate failures
are reported as command errors and make that entry disabled. Call `update` when app state
changes to refresh enabled state; the React `useCommands` hook does this after each render.
Equal snapshots retain their array identity across focus and definition updates. Override
replacement still notifies subscribers so consumers of `commands.keys(id)` can refresh keys
for unfocused scopes.

React's Legend omits disabled commands and commands without keys. ChordHint omits disabled
sequences. `tree.toggle` has no default key; supply an override to include it in Legend.
The default preset retains component commands, confirmation controls and the generic/navigation
ids used by examples (`next`, `previous`, `open`, `approve`, `p-home`).
