---
"@densedash/core": patch
"@densedash/react": patch
---

Behavior change: `tree.collapse` now does nothing on a leaf or an already-collapsed row at any depth, preserving highlight, selection, expansion and scroll position instead of moving to the parent. This applies to Tree, nested List and nested Table, including arrow keys, shifted presets and right-to-left layouts. Expanded rows still collapse, and `tree.parent` keeps its separate command and key.
