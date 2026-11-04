# DD-5 contract

- Acceptance: changing a token makes the read-only generated check fail; regeneration restores success for CSS, registry JSON, and docs JSON.
- Acceptance: inspect base scales, meaning-based colours, and component tokens in generated CSS.
- Acceptance: browser checks cover system and forced themes, compact/comfortable density, and nested density.
- Acceptance: inspect density blocks for size tokens only, and show an unlayered app rule overriding tokens without !important.
- Acceptance: a scratch component with literal colours or lengths fails lint and build; deletion restores success.
- Acceptance: calculate text/surface, muted/surface, text/highlight, and text/selection contrast in each theme; require 4.5:1.
- Threat model: all files and actors are trusted. In scope: theme drift and unreadable contrast.
- Non-goals: component rules, Tailwind plugins, app-specific colours, and new tests.
- Invariants: src/tokens.ts owns token values; theme and density keys match; density changes only component sizes; package CSS stays layered.
- Ownership and ordering: the generator renders all outputs before writing; check mode never writes; build validates before copying assets. No locks, clocks, retries, or cancellation protocol is needed.
