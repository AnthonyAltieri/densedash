/** The only source of token values. Run `pnpm --filter @densedash/css generate` after editing. */
const base = {
  "--dd-base-neutral-0": "#ffffff",
  "--dd-base-neutral-50": "#f8fafc",
  "--dd-base-neutral-100": "#f1f5f9",
  "--dd-base-neutral-200": "#e2e8f0",
  "--dd-base-neutral-300": "#cbd5e1",
  "--dd-base-neutral-400": "#94a3b8",
  "--dd-base-neutral-500": "#64748b",
  "--dd-base-neutral-600": "#475569",
  "--dd-base-neutral-700": "#334155",
  "--dd-base-neutral-800": "#1e293b",
  "--dd-base-neutral-900": "#0f172a",
  "--dd-base-neutral-950": "#020617",
  "--dd-base-blue-100": "#dbeafe",
  "--dd-base-blue-300": "#93c5fd",
  "--dd-base-blue-700": "#1d4ed8",
  "--dd-base-blue-950": "#172554",
  "--dd-base-green-300": "#86efac",
  "--dd-base-green-700": "#15803d",
  "--dd-base-red-300": "#fca5a5",
  "--dd-base-red-400": "#f87171",
  "--dd-base-red-700": "#b91c1c",
  "--dd-base-red-800": "#991b1b",
  "--dd-base-amber-100": "#fef3c7",
  "--dd-base-amber-300": "#fcd34d",
  "--dd-base-amber-700": "#b45309",
  "--dd-base-amber-950": "#451a03",
} as const satisfies Record<`--dd-base-${string}`, `#${string}`>;

type BaseReference = `var(${keyof typeof base})`;

const light = {
  "--dd-color-surface": "var(--dd-base-neutral-0)",
  "--dd-color-text": "var(--dd-base-neutral-900)",
  "--dd-color-surface-muted": "var(--dd-base-neutral-50)",
  "--dd-color-text-secondary": "var(--dd-base-neutral-700)",
  "--dd-color-text-muted": "var(--dd-base-neutral-600)",
  "--dd-color-border": "var(--dd-base-neutral-300)",
  "--dd-color-border-muted": "var(--dd-base-neutral-200)",
  "--dd-color-accent": "var(--dd-base-blue-700)",
  "--dd-color-highlight": "var(--dd-base-amber-100)",
  "--dd-color-selection": "var(--dd-base-blue-100)",
  "--dd-color-positive": "var(--dd-base-green-700)",
  "--dd-color-negative": "var(--dd-base-red-700)",
  "--dd-color-warning": "var(--dd-base-amber-700)",
  "--dd-color-danger": "var(--dd-base-red-800)",
  "--dd-color-focus": "var(--dd-base-blue-700)",
} as const satisfies Record<`--dd-color-${string}`, BaseReference>;

const dark = {
  "--dd-color-surface": "var(--dd-base-neutral-900)",
  "--dd-color-text": "var(--dd-base-neutral-100)",
  "--dd-color-surface-muted": "var(--dd-base-neutral-950)",
  "--dd-color-text-secondary": "var(--dd-base-neutral-300)",
  "--dd-color-text-muted": "var(--dd-base-neutral-400)",
  "--dd-color-border": "var(--dd-base-neutral-700)",
  "--dd-color-border-muted": "var(--dd-base-neutral-800)",
  "--dd-color-accent": "var(--dd-base-blue-300)",
  "--dd-color-highlight": "var(--dd-base-amber-950)",
  "--dd-color-selection": "var(--dd-base-blue-950)",
  "--dd-color-positive": "var(--dd-base-green-300)",
  "--dd-color-negative": "var(--dd-base-red-300)",
  "--dd-color-warning": "var(--dd-base-amber-300)",
  "--dd-color-danger": "var(--dd-base-red-400)",
  "--dd-color-focus": "var(--dd-base-blue-300)",
} as const satisfies Record<keyof typeof light, BaseReference>;

/** Density never changes fonts, colours, borders, or focus indicators. */
const components = {
  "--dd-font-sans": '"IBM Plex Sans", "Inter Tight", system-ui, sans-serif',
  "--dd-font-mono": '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
  "--dd-border-width": "1px",
  "--dd-radius": "0.25rem",
  "--dd-focus-width": "2px",
  "--dd-focus-offset": "2px",
  "--dd-font-weight-medium": "500",
  "--dd-kbd-font-size": "0.6875rem",
  "--dd-kbd-line-height": "1",
  "--dd-kbd-padding-block": "0.125rem",
  "--dd-kbd-padding-inline": "0.25rem",
  "--dd-kbd-border-bottom-width": "2px",
  "--dd-kbd-radius": "0.1875rem",
  "--dd-footer-height": "1.875rem",
  "--dd-footer-gap": "0.875rem",
  "--dd-footer-padding-inline": "1.25rem",
  "--dd-footer-font-size": "0.75rem",
  "--dd-footer-status-gap": "0.5rem",
} as const satisfies Record<`--dd-${string}`, string>;

type Length = `${number}${"rem" | "px"}`;

const compact = {
  "--dd-row-height": "1.75rem",
  "--dd-control-height": "1.75rem",
  "--dd-indent": "1rem",
  "--dd-font-size": "0.8125rem",
  "--dd-line-height": "1.25rem",
  "--dd-icon-size": "0.875rem",
  "--dd-gap": "0.25rem",
  "--dd-cell-padding-inline": "0.5rem",
  "--dd-cell-padding-block": "0.25rem",
} as const satisfies Record<`--dd-${string}`, Length>;

const comfortable = {
  "--dd-row-height": "2.25rem",
  "--dd-control-height": "2.25rem",
  "--dd-indent": "1.25rem",
  "--dd-font-size": "0.875rem",
  "--dd-line-height": "1.5rem",
  "--dd-icon-size": "1rem",
  "--dd-gap": "0.5rem",
  "--dd-cell-padding-inline": "0.75rem",
  "--dd-cell-padding-block": "0.375rem",
} as const satisfies Record<keyof typeof compact, Length>;

export const tokens = {
  base,
  themes: { light, dark },
  components,
  density: { compact, comfortable },
  defaults: { theme: "system", density: "compact" },
} as const;

export type Theme = keyof typeof tokens.themes;
export type Density = keyof typeof tokens.density;
export type TokenName =
  | keyof typeof base
  | keyof typeof light
  | keyof typeof components
  | keyof typeof compact;
