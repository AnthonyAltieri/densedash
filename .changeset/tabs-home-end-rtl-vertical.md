---
"@densedash/core": minor
"@densedash/css": minor
"@densedash/react": minor
---

Tabs: while focus is in a tab list, `tabs.first` and `tabs.last` (Home and End in `tradingPreset`) select and focus the first and last enabled tab. In right-to-left text, `tabs.next` and `tabs.prev` (ArrowRight and ArrowLeft) follow the visual direction, read from the list's computed `direction` when the key is pressed. `Tabs.List` takes `orientation="vertical"`, sets `aria-orientation` and `data-orientation`, and in a column answers `tabs.down` and `tabs.up` (ArrowDown and ArrowUp) instead; `tabs.css` lays a vertical list out beside its panels. Several `Tabs.List`s in one `Tabs.Root` are views of the same tabs: the first mounted list keeps the existing tab ids that panels are labelled by, and each later list prefixes its tab ids with its own id, so no ids repeat.
