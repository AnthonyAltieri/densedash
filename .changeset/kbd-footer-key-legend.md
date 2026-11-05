---
"@densedash/core": minor
"@densedash/css": minor
"@densedash/react": minor
---

Add the raised `Kbd` keycap style, a `KbdRange` part (`1–3`), and a `Footer` bar (`Footer.Root`, `Footer.Legend`, `Footer.Status`) whose legend lists the keys bound right now from the keymap. The default keyboard port's `format` now emits compact keycap labels: `⇧J` and `⌘K` on macOS, `Shift+J` and `Ctrl+K` elsewhere, and lower-case letters for unmodified keys and sequences (`j`, `g r`). New tokens: `--dd-color-surface-muted`, `--dd-color-text-secondary`, `--dd-color-border-muted`, `--dd-font-weight-medium`, and the `--dd-kbd-*` and `--dd-footer-*` sizes.
