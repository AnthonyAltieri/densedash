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
      "useTree infers T from roots; getKey returns a stable string and getChildren returns the item's children. Viewport's row.item keeps T. Root and Viewport share one TreeHandle<T>. The default focus strategy uses aria-activedescendant; roving focus is optional.",
    parts: [
      ...collectionParts,
      ["Indent", "span · tree-indent", "data-depth"],
      ["Toggle", "button · tree-toggle", rowState],
    ],
  },
  list: {
    title: "List",
    description:
      "A flat listbox using the tree's navigation and selection model. The shared tree stylesheet is intentional: List emits tree-* slots.",
    types:
      "useList infers T from roots and returns TreeHandle<T>. Its options omit getChildren and expanded. List.Root takes tree={list}; row.item in List.Viewport is your inferred item type.",
    parts: collectionParts,
  },
  table: {
    title: "Table",
    description:
      "Typed columns, numeric alignment and stable sorting on the tree model. Nested data becomes a treegrid; flat data becomes a grid.",
    types:
      "columns<T>().accessor checks field names and infers format/sort value types; cell infers computed values. useTable infers T from roots. inferKinds finds runtime value kinds; getSortedRows sorts siblings before they reach the tree. Missing and mismatched values render empty and sort last. Root sets --dd-table-columns; the core sets --dd-depth on rows: these runtime values are not theme tokens.",
    parts: [
      ["Root", "div · table-root", rootState],
      ["Header", "div · table-header", "role=row; aria-rowindex=1"],
      [
        "HeaderCell",
        "div · table-header-cell",
        "data-align, data-numeric, data-sortable, data-sorted, data-chosen, data-direction",
      ],
      [
        "Viewport",
        "div · table-viewport",
        "data-virtualized; role=rowgroup; tree-viewport-spacer divs when virtualized",
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
      "Tabs.Root infers its Value union from items. defaultValue, value and onValueChange follow that union. List renders items automatically; Panel.value identifies its tab. keepMounted preserves hidden children. Every tab is a native button; use Tab to reach buttons and 1–9 to select within the group.",
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
