// Parts are transcribed from the React parts and core prop getters; values/keys are generated.
const rowState =
  "data-highlighted, data-selected, data-expanded, data-depth, data-disabled, data-leaf";
const rootState = `${rowState}, data-empty`;
const collectionParts = [
  ["Root", "div · tree-root", rootState],
  [
    "Viewport",
    "div · tree-viewport",
    "virtual or virtualizer; data-virtualized; tree-viewport-spacer divs when virtualized",
  ],
  ["Row", "div · tree-row", rowState],
];

export const components = {
  keymap: {
    title: "Keymap",
    description:
      "Give each Tree, List or Tabs instance a labelled key layer. Drive several cursors anywhere on the page, with live legends, chord hints and confirmation prompts.",
    types:
      "The registry's Keymap.Provider owns a browser kernel and disposes it on unmount. Pass a stable KeysOptions object. With your own kernel, use Densedash.Provider instead. Pass keys: { label, preset?, overrides? } to useTree, useList, Tabs.Root or useCommands for page-wide dispatch. A layer preset replaces its entire map; omitted commands are unbound. Without a preset, overrides replace individual kernel bindings. Omit keys to keep focus-scoped behavior. shiftedTreePreset supplies Shift+J/K/L/H. Duplicate layer keys throw with both owners. Augment core's Register.commands for app-wide command ids. Keymap.Legend and Footer.Legend show one item per group using its short groupLabel, with keys side by side. Primary hints show by default; all includes secondary hints (and Keymap alternative keys). labels overrides group labels by id; explicit groupBy/filter take precedence and see secondary entries too. Instance layer names win over group labels.",
    parts: [
      ["Provider", "context · no element", "Registry wrapper; keys?: KeysOptions"],
      ["Scope", "div · keymap-scope", "data-scope, data-active, data-page"],
      [
        "Legend",
        "div · keymap-legend",
        "data-empty; group div: data-group; item div: data-group or data-command",
      ],
      [
        "Legend internals",
        "div · keymap-legend-group / item; span · keys / label",
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
      "useTree infers T from data; getRowId returns a stable, unique string and getSubRows returns the item's children. Viewport passes TanStack's row: row.original keeps T. Root and Viewport share one TreeHandle<T>; tree.table is its TanStack table (null until the root mounts). expanded and rowSelection are TanStack state, { [id]: true }. The default focus strategy uses aria-activedescendant; roving focus is optional. Rows render after mount, so server-rendered HTML holds the root and an empty viewport. Viewport's virtual prop mounts only the rows in view, estimated at --dd-row-height and measured as they render, so rows of differing heights need no setup; virtualizer takes a custom Virtualizer instead. labels: { expand, collapse } localizes the toggle's accessible names.",
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
        "virtual or virtualizer; data-virtualized; role=rowgroup; tree-viewport-spacer divs when virtualized or after the header",
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
      "A 30px bar for the bottom of a shell. The legend pairs related primary shortcuts from the live keymap, so a scope that loses focus or unmounts leaves it. A status slot sits at the end of the row.",
    types:
      'Footer.Root holds Footer.Legend and Footer.Status. Legend reads the kernel\'s keymap and keeps no key list of its own. Each item shows the first key of each entry it joins and a label; three or more consecutive digits read as a range. Items default to the instance layer, then the command group and its short groupLabel; ungrouped entries keep their command label. Built-in move, open/close, sort, tab pick and step hints show by default. Activate, jump, page, parent, selection and toggle hints are secondary; pass all to show them. labels={{ "tree.move": "navigate" }} overrides group labels by id. Instance layer names and explicit groupBy(entry) labels win; filter(entry) selects entries. Explicit groupBy/filter see secondary hints too. order uses group ids or layer names. Page layers keep all their hints. Status takes any children, such as an update time.',
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
  "app-shell": {
    title: "App shell",
    description:
      "A keyboard-driven three-pane shell: a sidebar Tree of pages and nested groups, a List whose rows expand to show their children, and a detail pane with numbered Tabs, above a Footer with the live key legend and a status slot. Every pane's keys answer anywhere on the page.",
    types:
      "The app owns every handle and value: pass useTree's handle to Sidebar and useList's to List, each with its own keys: { label, preset } layer, and keys: { label } to Detail for page-wide 1–3. The shell keeps no navigation state. The cursor and expanded rows stay in each handle's TanStack state; the open page (Sidebar's page), the highlighted list item (a controlled highlighted value) and the tab (Detail's value) stay in the app. Sidebar calls onPageChange(item) when its cursor lands on a page, a row without children. Children render functions receive TanStack's row, so row.original keeps your item type, and both panes accept virtual. Detail infers its Value union from items. Pane headers read their keys from the handle's layer, so a preset change relabels them. This example passes its own reporter port, whose trace wraps every command, to describe each key in the footer status, so it creates its kernel itself and exposes it with Densedash.Provider.",
    parts: [
      [
        "Root",
        "div · app-shell",
        "A page Keymap.Scope (page={false} opts out): data-scope, data-active, data-page",
      ],
      ["Panes", "div · app-shell-panes", "Flex row that wraps: sidebar, then list, then detail"],
      [
        "Sidebar",
        "aside · app-shell-sidebar",
        "app-shell-header with app-shell-brand and app-shell-keys; a Tree whose rows take data-current and aria-current=page on the open page, plus the tree-row states",
      ],
      [
        "List",
        "section · app-shell-list",
        "app-shell-header with h1 · app-shell-title, span · app-shell-breadcrumb and app-shell-keys; a List of tree-row rows (data-highlighted, data-expanded, data-depth, data-leaf)",
      ],
      [
        "Detail",
        "section · app-shell-detail",
        "Tabs: app-shell-detail-header (the header prop and tabs-list), then app-shell-detail-body; tabs-tab data-selected",
      ],
      [
        "Footer",
        "footer · footer",
        "footer-legend from the live keymap (filter, groupBy, order, all, labels); footer-status for children",
      ],
      ["Label", "span · app-shell-label", "Row text that ends in an ellipsis"],
      ["Count", "span · app-shell-count", "Muted monospace count at the end of a row"],
    ],
    keys: [
      [
        "j / k",
        "Sidebar",
        "tree.next / tree.prev",
        "Next or previous visible item, groups included. Landing on a page opens it in the list.",
      ],
      [
        "l",
        "Sidebar",
        "tree.expand",
        "Opens a closed group. Does nothing on an open group or a page.",
      ],
      [
        "h",
        "Sidebar",
        "tree.collapse",
        "Closes an open group. Does nothing on a closed group or a page, at any level.",
      ],
      [
        "Shift+J / Shift+K",
        "List",
        "tree.next / tree.prev",
        "Next or previous row, stepping into the children of expanded rows.",
      ],
      [
        "Shift+L",
        "List",
        "tree.expand",
        "Expands a row with children. Does nothing on an expanded row, a row without children or a child row.",
      ],
      [
        "Shift+H",
        "List",
        "tree.collapse",
        "Collapses an expanded row. Does nothing on a collapsed row or a row without children, at any level.",
      ],
      ["1–3", "Detail", "tabs.select.1–3", "Selects Overview, the children tab or Log."],
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
