# Component styles

The shipped styles cover Keymap scopes, legends, chord hints and confirmation prompts,
Kbd/KbdRange key caps, Footer, Tree and List rows, Tabs and Table. Rules are keyed on `data-slot`
and state attributes. `tree.css` serves both Tree and List; `index.css` declares
the component layer without importing the individual styles.

Wrap every file in `@layer dd.components { ... }`. Consumers import files through
`@densedash/css/components/<name>.css` after importing `@densedash/css/tokens.css`.

Use `var(--dd-*)` for colours, lengths, and numeric visual values, including zero.
Add values to `src/tokens.ts` and regenerate rather than defining variables here.
`pnpm --filter @densedash/css lint:css` rejects literal colours, dimensions, percentages,
numbers, literal fallbacks, foreign variables, custom property declarations, and `!important`.
Structural keywords such as `flex`, `auto`, and `solid` are allowed.
