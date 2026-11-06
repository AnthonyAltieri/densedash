---
"@densedash/css": minor
"@densedash/react": minor
---

Add `AppShell`, a keyboard-driven three-pane shell: `AppShell.Root` (the page's key scope), `AppShell.Panes`, `AppShell.Sidebar` (a Tree of pages and nested groups; the app passes the open `page` and gets `onPageChange(item)` when the cursor lands on one), `AppShell.List` (a nested List with a heading, breadcrumb and its layer's keys), `AppShell.Detail` (numbered Tabs under an app-supplied header) and `AppShell.Footer` (the live key legend and a status slot), plus `AppShell.Label` and `AppShell.Count` for row content. Every pane takes the app's `useTree`/`useList` handle and key layers, so the cursor and expanded rows stay in each instance's TanStack state and the shell keeps no navigation state. Rows ignore pointer hover, so the cursor moves only by key, click or the app. New stylesheet `components/app-shell.css`; new tokens `--dd-color-selection-muted` (with `--dd-base-blue-50`), `--dd-font-weight-semibold`, `--dd-font-weight-bold` and the `--dd-app-shell-*` sizes.
