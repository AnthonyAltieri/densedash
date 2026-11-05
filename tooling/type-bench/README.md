# Type instantiation budget

Run `pnpm build` and then `pnpm type-budget` from the repository root. The bench
uses TypeScript 5.9.3 and built package declarations. The limit remains 1,800
instantiations. Timing and memory are diagnostics, not pass criteria.

## React part coverage and headroom

DD-23 measured app-style JSX consumers in addition to the existing kernel,
commands and 30-column Table workload. Each consumer imported the emitted React
entry. A temporary project extended this bench's tsconfig, enabled `react-jsx`,
and included `input.ts` plus the candidate. No implementation sources or test
files were included. These totals were re-measured after updating to main
`f68c3b2582d834720d63e7d0215770ed0478f95a`. The original dispatch-base
workload used 1,728 instantiations; main reduced it to 1,677 without removing
any bench consumers.

| Added consumer | Total instantiations | Increase over baseline |
| -------------- | -------------------: | ---------------------: |
| None           |                1,677 |                      0 |
| Tree           |                6,692 |                  5,015 |
| List           |                4,860 |                  3,183 |
| Tabs           |                5,540 |                  3,863 |
| Keymap and Kbd |                5,417 |                  3,740 |
| All four       |               10,063 |                  8,386 |

The Tree candidate used `useTree`, Root, Viewport, Row, Indent and Toggle with
inferred item callbacks and a state-dependent row class. List used `useList`,
Root, Viewport and Row with disabled/open callbacks. Tabs used Root, List, Tab
and Panel with inferred values and a cancellable value-change callback. Keymap
used Scope, Legend, ChordHint, ConfirmPrompt and Kbd with state and entry callbacks.
These are complete rendered consumers, rather than imports of component names.

Every candidate individually exceeds the remaining 123 instantiations. Under the
unchanged limit, the largest fitting set of these complete consumers is empty;
Tree, List, Tabs and Keymap/Kbd rendering remain excluded. Tree is the largest
measured individual addition. Reducing public part-type instantiation costs is
follow-up work before adding these workloads. The existing Table workload and
kernel/command coverage are preserved. Even smaller hook-only consumers reusing
the existing Table row model did not fit: Tree totaled 1,831, List 1,931, and
both 1,991 instantiations. These totals used key/text accessors, Tree children,
and a disabled predicate for List.

## Separate compiler programs

Keep `tooling/type-bench` excluded from the root tsconfig. This project deliberately
augments `Register.commands` with one app's command ids. A root project reference
would not remove files selected by the root's `include`; isolation would still
require narrowing that include or retaining the exclude. The bench already has
its own tsconfig and command, so a reference adds no needed build output.

`pnpm exec tsc --listFilesOnly` excludes this bench's input, while
`pnpm exec tsc -p tooling/type-bench/tsconfig.json --listFilesOnly` includes it and
loads core's emitted declarations rather than its implementation source.

## Build dependency decision

Keep `turbo.json` unchanged. Its package `build` task uses `dependsOn: ["^build"]`.
The virtual plugin declares workspace dependencies on core and React; the build
dry run lists both as prerequisites, and React itself depends on core. The root
`//#typecheck` and `//#test` entries are prerequisites for root consumers of built
declarations, not a serial package build order. Inspect with
`pnpm turbo run build --dry=json`.
