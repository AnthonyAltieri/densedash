// Parts are transcribed from the React parts and core prop getters; values/keys are generated.
const rowState =
  "data-highlighted, data-selected, data-expanded, data-depth, data-disabled, data-leaf";
const rootState = `${rowState}, data-empty`;
const collectionParts = [
  ["Root", "div · tree-root", rootState],
  [
    "Viewport",
    "div · tree-viewport",
    "data-virtualized; tree-viewport-spacer divs when virtualized",
  ],
  ["Row", "div · tree-row", rowState],
];

export const components = {
  keymap: {
    title: "Keymap",
    description:
      "One preset chooses the keys. Focus chooses the scope. Live legends, chord hints and confirmation prompts follow the active commands.",
    types:
      "The registry's Keymap.Provider owns a browser kernel and disposes it on unmount. Pass a stable KeysOptions object. With your own kernel, use Densedash.Provider instead. useCommands accepts Command definitions; augment core's Register.commands for app-wide command ids.",
    parts: [
      ["Provider", "context · no element", "Registry wrapper; keys?: KeysOptions"],
      ["Scope", "div · keymap-scope", "data-scope, data-active, data-page"],
      [
        "Legend",
        "div · keymap-legend",
        "data-empty; group div: data-group; item div: data-command",
      ],
      [
        "Legend internals",
        "div · keymap-legend-group / group-label / item; span · keys / label",
        "All suffixes prefixed keymap-legend-",
      ],
      [
        "ChordHint",
        "div · keymap-chord-hint",
        "data-prefix; option div: data-command; rendered only during a sequence",
      ],
      [
        "ChordHint internals",
        "div · prefix / option; span · keys / label",
        "All suffixes prefixed keymap-chord-hint-",
      ],
      [
        "ConfirmPrompt",
        "div · keymap-confirm-prompt",
        "data-command; rendered only with pending intent",
      ],
      [
        "ConfirmPrompt internals",
        "span · keymap-confirm-prompt-text; button · confirm / cancel",
        "Buttons use keymap-confirm-prompt-confirm / -cancel",
      ],
    ],
  },
  kbd: {
    title: "Kbd",
    description:
      "Raised keycaps for chords, sequences and ranges, formatted for the platform: ⇧J and ⌘K on macOS, Shift+J and Ctrl+K elsewhere, g r for a sequence. A label displays a binding; it does not register a command.",
    types:
      "hotkey is KeyboardHotkey (a checked chord or sequence). Children replace its formatted label. KbdState.sequence tells a render function whether there are multiple steps. KbdRange takes from and to hotkeys and renders two keycaps joined by an en dash, such as 1–3. Both require a kernel provider, even for preformatted children. The keycap keeps one size at both densities.",
    parts: [
      ["Kbd", "kbd · kbd", "data-sequence"],
      ["KbdRange", "span · kbd-range", "Two kbd children joined by an en dash"],
    ],
  },
  tree: {
    title: "Tree",
    description:
      "Nested rows from data, with keyboard highlight, expansion and selection. DOM children never register the collection.",
    types:
      "useTree infers T from data; getRowId returns a stable, unique string and getSubRows returns the item's children. Viewport passes TanStack's row: row.original keeps T. Root and Viewport share one TreeHandle<T>; tree.table is its TanStack table (null until the root mounts). expanded and rowSelection are TanStack state, { [id]: true }. The default focus strategy uses aria-activedescendant; roving focus is optional. Rows render after mount, so server-rendered HTML holds the root and an empty viewport. Viewport's virtualizer may measure rows of differing heights (tanstackVirtual({ measure: true })). labels: { expand, collapse } localizes the toggle's accessible names.",
    parts: [
      ...collectionParts,
      ["Indent", "span · tree-indent", "data-depth"],
      ["Toggle", "button · tree-toggle", rowState],
    ],
  },
  list: {
    title: "List",
    description:
      "A listbox using the tree's navigation and selection model: flat, or nested when items have sub-rows. The shared tree stylesheet is intentional: List emits tree-* slots.",
    types:
      "useList takes the tree's options and returns TreeHandle<T>, inferring T from data. getSubRows nests the list; next and previous step through expanded sub-rows. List.Root takes tree={list}; row.original in List.Viewport is your inferred item type, and list.table is the TanStack table.",
    parts: [
      ...collectionParts,
      ["Indent", "span · tree-indent", "data-depth"],
      ["Toggle", "button · tree-toggle", rowState],
    ],
  },
  table: {
    title: "Table",
    description:
      "TanStack column definitions, numeric alignment and TanStack sorting on the tree's engine. Nested data becomes a treegrid; flat data becomes a grid.",
    types:
      "columns<T>() wraps TanStack's createColumnHelper. accessor(key) checks the field name and types format and compare with its value; accessor(fn, { id }) types a computed value. useTable infers T from data and takes the tree's options (getRowId, getSubRows, expanded, rowSelection) plus columns and sorting, TanStack's [{ id, desc }]. table.sort, table.next-column and header clicks drive that state, and TanStack sorts sub-rows within their parent. sort: \"desc\" starts a column descending; sort: false makes it unsortable. numeric: true aligns a column to the end in tabular figures. Missing values, and non-numbers in a numeric column, render empty and sort last. table.state holds sorting and chosenColumn; table.table is the TanStack table (null until the root mounts). Root sets --dd-table-columns; the core sets --dd-depth on rows: these runtime values are not theme tokens.",
    parts: [
      ["Root", "div · table-root", rootState],
      [
        "Header",
        "div · table-header",
        "role=row; aria-rowindex=1; Viewport's sticky first child (header prop)",
      ],
      [
        "HeaderCell",
        "div · table-header-cell",
        "data-align, data-numeric, data-sortable, data-sorted, data-chosen, data-direction",
      ],
      [
        "Viewport",
        "div · table-viewport",
        "data-virtualized; role=rowgroup; tree-viewport-spacer divs when virtualized or after the header",
      ],
      ["Row", "div · table-row", rowState],
      ["Cell", "div · table-cell", "data-align, data-numeric, data-empty"],
      ["Toggle", "button · table-toggle", rowState],
      ["Value", "formatted ReactNode · no element", "No slot or attributes; place inside a Cell"],
    ],
  },
  tabs: {
    title: "Tabs",
    description:
      "Numbered, data-defined tabs. Only the focused group answers, and the preset supplies the number keys.",
    types:
      "Tabs.Root infers its Value union from items. defaultValue, value and onValueChange follow that union. List renders items automatically; Panel.value identifies its tab. keepMounted preserves hidden children. Every tab is a native button. Tab reaches the selected tab, ArrowLeft and ArrowRight move between tabs while the list has focus, and 1–9 select within the group.",
    parts: [
      ["Root", "div · tabs", "data-value, data-active, data-scope"],
      ["List", "div · tabs-list", "role=tablist"],
      ["Tab", "button · tabs-tab", "data-selected, data-disabled, data-value"],
      ["Panel", "div · tabs-panel", "data-selected, data-value; hidden when inactive"],
    ],
  },
  footer: {
    title: "Footer",
    description:
      "A 30px bar for the bottom of a shell. The legend lists the keys bound right now, read from the keymap, so a scope that loses focus or unmounts leaves it. A status slot sits at the end of the row.",
    types:
      "Footer.Root holds Footer.Legend and Footer.Status. Legend reads the kernel's keymap and keeps no key list of its own. Each item shows the first key of each entry it joins and a label; three or more consecutive digits read as a range. groupBy(entry) names the item an entry joins (default: its command group; ungrouped entries stand alone with their command label), and filter(entry) drops entries. Status takes any children, such as an update time.",
    parts: [
      ["Root", "footer · footer", "Wraps onto more rows on narrow screens"],
      ["Legend", "div · footer-legend", "data-empty; role=group"],
      [
        "Legend internals",
        "span · footer-legend-item / footer-legend-label; kbd · kbd",
        "item span: data-group, or data-command when ungrouped; a range is kbd–kbd",
      ],
      ["Status", "div · footer-status", "Pushed to the end of the row; mono"],
    ],
  },
  theme: {
    title: "Theming",
    description:
      "Restyle through CSS variables on a wrapper. The component CSS stays the same. Use the header controls to compare both themes and densities.",
    types:
      "The theme item merges cssVars into Tailwind's CSS file and copies tokens.css for system color-scheme, explicit data-theme selectors, density attributes and layer ordering. cssVars alone cannot express these selectors. The example's style object uses CSSProperties with --dd-* keys.",
    parts: [
      [
        "Theme owner",
        "html or subtree · no component slot",
        "data-theme=light|dark; data-dd-density=compact|comfortable; Tailwind .dark also switches registry cssVars",
      ],
    ],
  },
};

export type ComponentName = keyof typeof components;
export const componentNames = Object.keys(components) as ComponentName[];

export function isComponentName(name: string): name is ComponentName {
  return Object.hasOwn(components, name);
}
