# densedash

An information-dense, keyboard-first UI framework. Work is tracked in Linear team DD.

## Development

Use Node 22.20.0 or a compatible newer LTS release and pnpm 12.3.4. The root `packageManager` pins pnpm. Dependency versions are exact, `saveExact` preserves that on additions, and CI installs the committed lockfile.

```sh
pnpm install
pnpm turbo run build lint typecheck test
pnpm publint
pnpm attw
pnpm changeset status
pnpm type-budget
```

`pnpm format` writes formatting with oxfmt. `pnpm lint` runs oxlint and checks formatting. Turbo caches package builds in the current checkout's `.turbo/cache`; root checks run every time because they cover the whole workspace. Shared build and TypeScript configuration changes invalidate package builds.

## Layout

```text
packages/<name>                 Published @densedash/* packages
apps/<name>                     Applications (apps/docs comes later)
examples/<framework>/<name>     Framework examples
tooling/tsdown-config           Shared ESM build configuration
tooling/tsconfig                Shared strict TypeScript configuration
tooling/type-bench              Compiler workload and instantiation budget
tasks/lessons                  One guardrail file per lesson
```

The workspace globs include apps, nested examples and tooling. React remains a stub; core exports the kernel, port contracts and pure collection helpers. All three library packages retain their version constant. There are no framework components or adapter dependencies yet.

`@densedash/core` exports `createKernel()` with TanStack Store, TanStack Hotkeys, real-time clock and console reporter defaults. Plugins replace defaults, and explicit `ports` replace plugin providers. Duplicate plugin providers throw even when an explicit override exists. Clock and reporter factories take no arguments; store and keyboard factories receive only the resolved clock and reporter. Setup runs after all ports resolve. Call `kernel.dispose()` to run setup cleanups in reverse order and then dispose the keyboard port, once; it attempts every cleanup even if one throws, and rolls back registered cleanups if setup fails. The kernel owns the resolved keyboard port, including an explicit override; use a separate port per kernel.

Use `kernel.ports.keyboard.bind("Mod+K", handler, { target: document })` for chords, or `bind(["G", "H"], handler)` for sequences. Keys use Hotkeys' exported checked string types; `Mod` resolves to Command on macOS and Control elsewhere. `platform` reports that choice and `format(hotkey)` produces a display label. `parse(savedValue)` validates untrusted strings or arrays and returns `{ ok: true, hotkey }` or `{ ok: false, reason }` without throwing. Bind trusted typed keys directly. Bindings prevent the browser default and stop propagation on a match. Conflict warnings are disabled; command policy belongs to the command layer.

`activateScope(name, { parent, exclusive: { allow: ["help"] } })` returns an idempotent release function. Descendants beat ancestors; otherwise the most recent activation wins. `exclusive: true` blocks other scopes, including `global`, while descendants remain active. Allowed scopes must also be activated unless they are `global`. Activations are counted. Bindings accept `scope`, `target`, `ignoreInputs` (defaults to `"auto"`), `enabled` and sequence `timeout` (defaults to 1,000 ms). Element targets require focus within them. Call `binding.update({ enabled: false, handler })` to merge options or replace the callback, and `binding.dispose()` to release it. Updating the target resets sequence progress. Updates after disposal do nothing; new bindings and activations after port disposal throw.

`keyboard.pending` exposes the read side of `Store`: `get()` and `subscribe(listener)`. It projects Hotkeys registrations into sequence entries with `id`, `hotkey`, `matchedStepCount`, `scope` and `target`; it clears on completion, timeout or disposal. Each default port owns an isolated Hotkeys manager, all subscriptions and DOM listeners. `keyboard.dispose()` releases them and any sequence timers idempotently. Only the default implementation imports Hotkeys at runtime; `bare` has no TanStack runtime dependencies.

`@densedash/core/bare` exports the same contracts and a `createKernel` with no default implementations in its import graph. Supply all four ports through plugins or explicit `ports`; missing ports throw before providers run. Use `satisfies Plugin` when declaring reusable plugins to retain provider-specific types.

`@densedash/core/conformance` exports `storeContract` and `runContract({ test, cases: storeContract, make })`. Each case calls `make()` for a fresh `StorePort`. The contract covers synchronous reads, notification order, batching and unsubscribe without importing a test runner. Store subscriptions run in registration order; `batch` publishes each changed store's final state once. Function-valued state is supported; use an updater such as `store.set(() => nextFunction)` to replace it.

The same entry exports `keyboardContract({ advanceTime })`. Run it with `runContract({ test, cases: keyboardContract({ advanceTime }), make })`, where `make()` returns a fresh keyboard port. Install DOM globals (for example Vitest's `happy-dom` environment), enable fake timers before each case, and pass `advanceTime: ms => { vi.advanceTimersByTime(ms); }`. The hook must advance both `Date.now()` and scheduled timers: Hotkeys owns sequence timing rather than using the kernel clock. Cases create and focus their DOM targets, dispatch synthetic keyboard events, and dispose ports in `finally`. They cover nested/recent scopes, exclusivity/allow, counted releases, timeout, pending progress, input filtering, enabled/handler updates and listener cleanup on element, document and window targets. No test-runner dependency is shipped.

New library packages can reuse `tooling/tsdown-config/index.ts` through a local `tsdown.config.ts` and copy the existing package build and validation scripts. Published packages use `type: module`, `dist/` exports with declarations, `sideEffects: false` and a `files` allowlist. Builds preserve source modules with `unbundle: true` and emit ESM only. Root tooling owns the pinned development dependencies.

## Tests and type work

Vitest discovers unit files named `*.test.ts` or `*.test.tsx` under packages, apps and examples. `pnpm test` runs these and type assertions in `*.test-d.ts` files. `pnpm test:types [file]` runs type assertions alone. Import `test` and `expectTypeOf` from `vitest` in a type assertion file. Empty test runs pass; this scaffold commits no tests.

The root tsconfig covers workspace TypeScript and extends `tooling/tsconfig/base.json`. It enables strict checking, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.

`pnpm type-budget` runs pinned TypeScript with `--extendedDiagnostics` over `tooling/type-bench/*.ts`. It fails on compiler errors, missing diagnostics, or more than 1,000 instantiations, as set in `budget.json`. The initial workload is 14 instantiations. The headroom lets early APIs grow while catching runaway recursive types. Extend `input.ts` to exercise public API inference as real APIs arrive. Review the workload and explain any budget increase together. Wall-clock time is diagnostic only, so machine speed does not determine the result.

## Release rehearsal

See [.changeset/README.md](.changeset/README.md) for the fixed release group and independent plugin versioning. CI validates packed package exports with publint and the ESM-only attw profile. That attw profile intentionally ignores CommonJS consumers; its ignored CommonJS diagnostic is expected for this ESM-only project. Vitest also prints its upstream experimental type-checking notice; its version is pinned.

The main release workflow can maintain version PRs. It has no publish command or npm credentials and creates no release tags. npm publication is a later ticket.
