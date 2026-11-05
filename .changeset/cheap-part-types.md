---
"@densedash/core": minor
"@densedash/css": patch
"@densedash/react": minor
---

Make the Tree, List, Tabs, Table, Keymap, Kbd and Footer part types far cheaper to typecheck. Parts extend the new `ElementAttributes<E>` (React's attributes, ARIA attributes, handlers and ref, picked by name) instead of `Omit<ComponentPropsWithRef<…>, …>`; `useTree` and `useList` extend core's new `TreeBaseOptions` and `ListBaseOptions`; command ids use intersections instead of `Extract`. `Tree.Root`, `Tree.Row`, `Table.Root` and `Table.Row` no longer infer an item type they never read. Part props no longer accept `defaultValue`, `defaultChecked` or `dangerouslySetInnerHTML`, and the tree toggle and tab buttons no longer accept `disabled`, `type`, `name`, `value` or `form*`.

Tree and Table rows use `contain: layout style` instead of `content-visibility: auto`, which made every key press check thousands of rows' visibility, and a row whose only change is its position no longer re-renders, so inserting a row above thousands of others re-renders one row. `Table.Row` subscribes to its own index for `aria-rowindex`.
