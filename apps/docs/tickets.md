# DD-15 contract

- Scope: one registry catalog and its source-backed documentation, seven items; package APIs stay unchanged. Small wrappers/examples account for the file count; keep production additions under about 2,000 lines.
- Registry: validate all seven items and embedded source files with Effect; demonstrate a named-item failure and removal of stale output.
- Installation: run shadcn 4.23.0 in a fresh Tailwind v4 app against the preview, list every installed file, render tree/tabs/table and drive tree keys; repeat tree against production after merge.
- Documentation: open every component page; verify live/source identity, inferred hovers, nonempty parts and applicable generated CSS/key tables with no browser warnings.
- Customization: drive replacement-preset and single-command override examples; compare light/dark and compact/comfortable variable-only restyling.
- Navigation: inspect every page at 1440px and 640px with no document overflow.
- Trust: repository sources are trusted; CLI-facing registry shape and missing files fail closed. No secrets, deployment-setting changes, tests, or new published APIs.
- Invariants: wrappers installed by shadcn are imported directly by live examples; token tables derive from token JSON and CSS references, key tables from tradingPreset; Shiki/twoslash remain build-only and source text remains exact.
- Ownership: each registry invocation removes old output, validates/reads the whole catalog, then writes; failure removes output. Each example Provider creates a kernel after mount and disposes it on cleanup; component roots own their collection scopes.
- Gates: targeted lint per edit; build/lint/typecheck and manual checks before review and on final head, provider CI including existing tests; PR evidence records final SHA, decisions and limitations. No new tests; DD-17 owns automation.
