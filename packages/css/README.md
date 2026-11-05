# @densedash/css

Design tokens and component styles for information-dense interfaces. Import the tokens once:

```ts
import "@densedash/css/tokens.css";
```

Use `var(--dd-color-surface)`, `var(--dd-color-text)`, `var(--dd-row-height)`,
and the other tokens in application styles. The token stylesheet sets variables and
`color-scheme`; it does not reset elements or load fonts. Import component styles separately:

```ts
import "@densedash/css/components/tree.css"; // Tree and List
import "@densedash/css/components/tabs.css";
import "@densedash/css/components/table.css";
```

Keymap styles ship as `keymap-scope.css`, `keymap-legend.css`,
`keymap-chord-hint.css` and `keymap-confirm-prompt.css`; import `kbd.css` for Kbd/KbdRange key caps and `footer.css` for Footer.
Rules target `data-slot` and state attributes, with visual values from `--dd-*` variables.

## Themes and density

The default theme follows `prefers-color-scheme`. Set `data-theme="light"` or
`data-theme="dark"` on `<html>` to force a theme. Remove the attribute to follow
the system again.

Compact density is the default. Set `data-dd-density="compact"` or
`data-dd-density="comfortable"` on `<html>` or a subtree. Density changes only
component sizes: row/control height, indentation, font size, line height, icon
size, gap, and cell padding. It preserves colours and font families.

The stylesheet declares `@layer dd.tokens, dd.base, dd.components` and puts all
token rules in `dd.tokens`. Component files use `dd.components`. Unlayered app
rules override these layers without `!important`, including forced dark mode:

```css
:root {
  --dd-color-accent: var(--app-accent);
  --dd-row-height: var(--app-row-height);
}
```

Define the application's variables in its own stylesheet. Font stacks use IBM
Plex Sans/Mono, Inter Tight, JetBrains Mono, and system fallbacks. Applications
choose whether to install those fonts.

## Source and generated outputs

`src/tokens.ts` is the only token source. It exposes three tiers:

- Base colour scales, named `--dd-base-<scale>-<step>`.
- Meaning-based colours, named `--dd-color-*`, referencing the base scales.
- Component tokens for fonts, borders, focus indicators, and density sizes.

Theme references must name existing base tokens. Both themes have the same
semantic keys; both densities have the same size keys. TypeScript checks these
constraints without recursive types. The main ESM entry exports `tokens` and
the inferred `TokenName`, `Theme`, and `Density` types.

Run from the repository root after changing the source:

```sh
pnpm --filter @densedash/css generate
pnpm --filter @densedash/css check:generated
pnpm --filter @densedash/css lint:css
pnpm --filter @densedash/css build
```

Commit all three files under `src/generated/`. The read-only staleness check
runs in package `lint`. Build runs package `lint`, including the component CSS
check, before emitting JavaScript and copying assets into `dist/`. This makes
both checks part of the existing Turbo build gate.

| Package export       | Contents                                                          |
| -------------------- | ----------------------------------------------------------------- |
| `./tokens.css`       | Layered variables, system/forced themes, and density selectors    |
| `./components/*.css` | Keymap, Kbd/KbdRange, Footer, Tree/List, Tabs and Table styles    |
| `./css-vars.json`    | `{ cssVars: { light, dark } }` for shadcn registry composition    |
| `./tokens.json`      | Defaults and rows with `name`, `tier`, and values for docs tables |

The [shadcn cssVars format](https://ui.shadcn.com/docs/registry/registry-item-json#cssvars)
uses keys without the leading `--`. Each theme map includes base scales,
component defaults, and semantic references. The JSON is registry metadata;
import `tokens.css` for the system theme, density attributes, and cascade layers.
The docs table retains CSS references for semantic tokens and records both
densities on each size row.

Text and muted text are intended for the surface background. Text also pairs
with highlight and selection backgrounds. Keep those pairs at WCAG AA 4.5:1 or
better when editing colours. Application overrides own their resulting contrast.
