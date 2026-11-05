---
"@densedash/core": minor
"@densedash/css": patch
"@densedash/react": minor
---

Make the Tree, List, Tabs, Table, Keymap, Kbd and Footer part types far cheaper to typecheck. Parts extend the new `ElementAttributes<E>` (React's attributes, ARIA attributes, handlers and ref, picked by name) instead of `Omit<ComponentPropsWithRef<…>, …>`; `useTree` and `useList` extend core's new `TreeBaseOptions` and `ListBaseOptions`; command ids use intersections instead of `Extract`. `Tree.Root`, `Tree.Row`, `Table.Root` and `Table.Row` no longer infer an item type they never read. Part props no longer accept `defaultValue`, `defaultChecked` or `dangerouslySetInnerHTML`, and the tree toggle and tab buttons no longer accept `disabled`, `type`, `name`, `value` or `form*`. `Tabs.Root` now passes a DOM `onChange` through to its element; use `onValueChange` for selection.

Tree and Table rows use `contain: layout style` instead of `content-visibility: auto`, which made every key press check thousands of rows' visibility, and a row whose only change is its position no longer re-renders its content: `Tree.Row` subscribes to its own `aria-posinset`/`aria-setsize` and `Table.Row` to its own index for `aria-rowindex`, so an insertion re-renders those parts but no row's content. `row.index`, `row.posInSet` and `row.setSize` in a viewport's row function can therefore be stale; read positions from `tree.state`.
