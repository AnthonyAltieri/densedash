---
"@densedash/react": minor
---

Breaking changes in 0.2.0, with the code to change. Each one is also described in its own entry.

**`Table.Viewport` renders the header.** Its `header` prop defaults to `<Table.Header />`, so the header row and the body share one scroll container and the header stays sticky. Remove a `<Table.Header />` placed before the viewport; pass `header={null}` for no header.

```tsx
// Before
<Table.Root table={table}>
  <Table.Header />
  <Table.Viewport table={table} />
</Table.Root>

// After
<Table.Root table={table}>
  <Table.Viewport table={table} />
</Table.Root>
```

**Part props drop `defaultValue`, `defaultChecked` and `dangerouslySetInnerHTML`.** Parts render `div`s and buttons, where these attributes do nothing or replace the part's own content. Put HTML inside a child element. Component props of the same name, such as `Tabs.Root`'s `defaultValue` (the first selected tab), are unchanged.

```tsx
// Before
<Tree.Row row={row} dangerouslySetInnerHTML={{ __html: row.original.html }} />

// After
<Tree.Row row={row}>
  <span dangerouslySetInnerHTML={{ __html: row.original.html }} />
</Tree.Row>
```

**`Tree.Toggle` and `Tabs.Tab` drop button form attributes.** They no longer accept `disabled`, `type`, `name`, `value` (as a DOM attribute) or `form*`; both always render `type="button"`. Disable a tab with `disabled: true` on its item in `Tabs.Root`'s `items`. `Tabs.Tab`'s own `value` prop, which names its item, is unchanged. To set any other button attribute, pass it on a `render` element.

```tsx
// Before
<Tree.Toggle disabled={locked} />
<Tabs.Tab value="orders" form="orders-form" />

// After
<Tree.Toggle render={<button disabled={locked} />} />
<Tabs.Tab value="orders" render={<button form="orders-form" />} />
```

**Tree, List and Table take `data`, `getRowId` and `getSubRows`.** `useTree`, `useList` and `useTable` run on TanStack Table: `roots`, `getKey` and `getChildren` become `data`, `getRowId` and `getSubRows`; `expanded` takes TanStack's `{ [id]: true }` (or `true`) instead of a `Set`, and `selected` becomes `rowSelection`. Row functions receive TanStack's row: read `row.original` instead of `row.item`, and `row.id` instead of `row.key`.

```tsx
// Before
const tree = useTree({
  roots: desks,
  getKey: (desk) => desk.id,
  getChildren: (desk) => desk.children,
  expanded: { defaultValue: new Set(["equities"]) },
});
<Tree.Viewport tree={tree}>
  {(row) => <Tree.Row row={row}>{row.item.label}</Tree.Row>}
</Tree.Viewport>;

// After
const tree = useTree({
  data: desks,
  getRowId: (desk) => desk.id,
  getSubRows: (desk) => desk.children,
  expanded: { defaultValue: { equities: true } },
});
<Tree.Viewport tree={tree}>
  {(row) => <Tree.Row row={row}>{row.original.label}</Tree.Row>}
</Tree.Viewport>;
```
