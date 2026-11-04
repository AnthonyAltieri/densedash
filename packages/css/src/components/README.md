# Component styles

Later component tickets add CSS files here, keyed on `data-slot` and state attributes.
`index.css` reserves the export directory with an empty layer so strict package
validation can resolve the wildcard before component rules exist.
Wrap every file in `@layer dd.components { ... }`. Consumers import files through
`@densedash/css/components/<name>.css` after importing `@densedash/css/tokens.css`.

Use `var(--dd-*)` for colours, lengths, and numeric visual values, including zero.
Add values to `src/tokens.ts` and regenerate rather than defining variables here.
`pnpm --filter @densedash/css lint:css` rejects literal colours, dimensions, percentages,
numbers, literal fallbacks, foreign variables, custom property declarations, and `!important`.
Structural keywords such as `flex`, `auto`, and `solid` are allowed.
