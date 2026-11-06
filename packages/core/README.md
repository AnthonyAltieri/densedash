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
Disabled commands release their keys to other scopes and the browser default. Duplicate keys
within one scope still belong to their first registered command, even when it is disabled.
Equal snapshots retain their array identity across focus and definition updates. Override
replacement still notifies subscribers so consumers of `commands.keys(id)` can refresh keys
for unfocused scopes.

`Footer.Legend` and `Keymap.Legend` join commands by `layer`, then `group`, and show their keys
side by side. `groupLabel` supplies the group's short label; a group without one uses its name.
Ungrouped commands keep their own labels. Footer shows the first key per command and compresses
three or more consecutive digits into a range. Keymap does the same for grouped commands;
ungrouped commands retain all their alternative keys.

Built-in primary hints cover moving, opening/closing, sorting, picking a tab and
stepping between tabs. Activating, jumping, paging, going to a parent, selecting/extending selection and
toggling expansion are secondary (`legend: "secondary"`). Both legends omit secondary hints
by default so a focused tree fits a narrow footer. Pass `all` to include them; `Keymap.Legend all`
also lists alternative keys. Disabled, hidden, shadowed and unbound commands remain omitted.
`tree.toggle` has no default key; bind it and use `all` to include it.

Pass `labels={{ "tree.move": "navigate", "tabs.pick": "choose a view" }}` to either legend to
override the default labels by group id, as with row label overrides. The command metadata is
the shared source for both legends; it can also be replaced through `commands.update`.
An instance's `keys: { label }` takes precedence and retains all its hints. An explicit `groupBy`
returns both the item's name and its label; it takes precedence over default labels. An explicit
`filter` or `groupBy` selects from all available entries, including secondary hints. `order`
uses group ids or layer names, independently of translated labels. `AppShell.Footer` forwards
these same options to its legend. None of these presentation options change bindings.

ChordHint omits disabled sequences.
The default preset retains component commands, confirmation controls and the generic/navigation
ids used by examples (`next`, `previous`, `open`, `approve`, `p-home`).
