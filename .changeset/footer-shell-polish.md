---
"@densedash/css": minor
"@densedash/react": minor
---

`Footer.Legend` and `AppShell.Footer` take an `order` list of item names (as `groupBy` returns them) to list first; other items keep keymap order. A plain `Footer` is now `--dd-footer-height` (30px) tall instead of 39px: `footer.css` sizes it with `box-sizing: border-box`, and the AppShell's footer override is gone. The shell matches its design more closely: 12px stroked chevrons in the sidebar and list toggles, a 14px sidebar indent step, a 6px sidebar row gap and a fainter rule between the list's child rows. New tokens `--dd-color-border-subtle`, `--dd-app-shell-row-gap`, `--dd-app-shell-indent`, `--dd-app-shell-chevron`, `--dd-app-shell-chevron-size`, `--dd-app-shell-chevron-color` and `--dd-app-shell-chevron-open-rotate`.
