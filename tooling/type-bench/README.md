# Type instantiation budget

Run `pnpm build` and then `pnpm type-budget` from the repository root. The bench
uses TypeScript 5.9.3 and built package declarations. The limit remains 1,800
instantiations. Timing and memory are diagnostics, not pass criteria.

## React part coverage

The bench includes a Tree consumer (`useTree` with inferred callbacks, Root,
Viewport and Row with a state-dependent class) and a Tabs consumer (Root with
inferred values and a cancellable change callback, and a Panel). They call the
parts as functions because this project compiles `.ts` without JSX; the props
are checked the same way.

DD-23 measured complete JSX consumers at 5,015 (Tree), 3,183 (List), 3,863
(Tabs) and 3,740 (Keymap and Kbd) instantiations each over a 1,677 baseline, so
none fit. DD-22 found the drivers with a patched compiler that counts
instantiations by type:

- `Omit<ComponentPropsWithRef<"div">, "className" | "style">` in every part's
  props. `Omit` is `Pick<T, Exclude<keyof T, K>>`, and `Exclude` distributes over
  the element's roughly 300 attribute and handler names, about a thousand
  instantiations per distinct `Omit`. Parts now extend `ElementAttributes<E>`,
  which picks React's attributes by name (`keyof HTMLAttributes<Element>`
  intersected with the wanted names, which instantiates nothing per key).
- `Extract<keyof typeof tradingPreset, …>` in core's command ids, which
  distributes over every preset key. It is now an intersection with the same
  result (about 170 fewer instantiations in the baseline).
- `Omit<TreeOptions<T>, "mode" | "scope">` and `Omit<UseTreeOptions<T>, …>` for
  `useTree` and `useList`. Core now declares `ListBaseOptions` and
  `TreeBaseOptions`, and the hooks extend them.
- Variance measurement of `TreeHandle`, `TreeSnapshot` and `ReadableStore`,
  which now declare `out` on their type parameter, and inference of an item type
  that `Tree.Root` and `Tree.Row` never read: both now take `unknown` items.

Measured on the same scratch JSX consumers before and after (totals including
the baseline):

| Consumer                | Before | After |
| ----------------------- | -----: | ----: |
| None (baseline)         |  1,677 | 1,507 |
| Tree                    |  6,805 | 2,915 |
| List                    |  4,924 | 2,726 |
| Tabs                    |  4,615 | 2,695 |
| Keymap and Kbd          |  5,414 | 2,649 |
| All four                |  9,279 | 3,522 |
| This bench (Tree, Tabs) |  4,665 | 1,737 |

The JSX totals include about 900 instantiations of React's own JSX and
intrinsic element types, which any React consumer pays once.

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
