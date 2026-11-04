---
"@densedash/core": minor
"@densedash/css": minor
"@densedash/react": minor
---

Add `Tabs.Root`, `Tabs.List`, `Tabs.Tab` and `Tabs.Panel` to the React adapter: controlled or uncontrolled tabs whose values are inferred from `items`, with number keys that select tabs through the `tabs.select.1` … `tabs.select.9` commands of the focused group. `tradingPreset` binds those commands to 1–9, `commands.keys(id)` reads a command's current keys, and `@densedash/css/components/tabs.css` styles the parts.
