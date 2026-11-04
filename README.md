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

The workspace globs include apps, nested examples and tooling. React remains a stub; core exports the kernel, commands, port contracts and pure collection helpers. All three library packages retain their version constant. There are no framework components or adapter dependencies yet.

`@densedash/core` exports `createKernel()` with TanStack Store, TanStack Hotkeys, real-time clock and console reporter defaults. Plugins replace defaults, and explicit `ports` replace plugin providers. Duplicate plugin providers throw even when an explicit override exists. Clock and reporter factories take no arguments; store and keyboard factories receive only the resolved clock and reporter. Setup runs after all ports resolve. Call `kernel.dispose()` to run setup cleanups in reverse order and then dispose commands and the keyboard port, once; it attempts every cleanup even if one throws, and rolls back registered cleanups if setup fails. The kernel owns the resolved keyboard port, including an explicit override; use a separate port per kernel.

Use `kernel.ports.keyboard.bind("Mod+K", handler, { target: document })` for chords, or `bind(["G", "H"], handler)` for sequences. Keys use Hotkeys' exported checked string types; `Mod` resolves to Command on macOS and Control elsewhere. `platform` reports that choice and `format(hotkey)` produces a display label. `parse(savedValue)` validates untrusted strings or arrays and returns `{ ok: true, hotkey }` or `{ ok: false, reason }` without throwing. Bind trusted typed keys directly. Bindings prevent the browser default and stop propagation on a match. Conflict warnings are disabled; command policy belongs to the command layer.

`activateScope(name, { parent, exclusive: { allow: ["help"] } })` returns an idempotent release function. Descendants beat ancestors; otherwise the most recent activation wins. `exclusive: true` blocks other scopes, including `global`, while descendants remain active. Allowed scopes must also be activated unless they are `global`. Activations are counted. Bindings accept `scope`, `target`, `ignoreInputs` (defaults to `"auto"`), `enabled` and sequence `timeout` (defaults to 1,000 ms). Element targets require focus within them. Call `binding.update({ enabled: false, handler })` to merge options or replace the callback, and `binding.dispose()` to release it. Updating the target resets sequence progress. Updates after disposal do nothing; new bindings and activations after port disposal throw.

`keyboard.pending` exposes the read side of `Store`: `get()` and `subscribe(listener)`. It projects Hotkeys registrations into sequence entries with `id`, `hotkey`, `matchedStepCount`, `scope` and `target`; it clears on completion, timeout or disposal. Each default port owns an isolated Hotkeys manager, all subscriptions and DOM listeners. `keyboard.dispose()` releases them and any sequence timers idempotently. Only the default implementation imports Hotkeys at runtime; `bare` has no TanStack runtime dependencies.

`@densedash/core/bare` exports the same contracts and a `createKernel` with no default implementations in its import graph. Supply all four ports through plugins or explicit `ports`; missing ports throw before providers run. Use `satisfies Plugin` when declaring reusable plugins to retain provider-specific types.

Commands separate action definitions from key choices. Both core entries export `Command`, `Commands`, `Preset`, `KeysOptions`, `Register`, `createCommands` and `tradingPreset`. Each kernel owns `kernel.commands`; plugins can register commands during setup and return their unregister function. Commands declare an `id`, `label`, optional `group`, `enabled()` predicate, `hidden`, `confirm: { prompt }` and `run({ event })`. Keys live in a preset, never in a command. `tradingPreset` supplies j/k and arrows, Control+U/D, Enter, h/l and horizontal arrows, Shift+Y/X approval/rejection, history brackets and the trading app's `g` navigation sequences. Apps supply every action, including navigation.

```ts
import { createKernel } from "@densedash/core";

declare module "@densedash/core" {
  interface Register {
    commands: { next: unknown; open: unknown; approve: unknown };
  }
}

const app = createKernel({ keys: { overrides: { open: ["Space"] } } });
const unregister = app.commands.register("rows", [
  { id: "next", label: "Next row", group: "rows", run: () => moveRow(1) },
  { id: "open", label: "Open row", run: () => openRow() },
  { id: "approve", label: "Approve", confirm: { prompt: "Approve row?" }, run: () => approveRow() },
]);
app.commands.invoke("open");
unregister();
app.dispose();
```

`Register.commands` is a map whose keys constrain command ids and `invoke()` without generics. Without augmentation, command ids are strings and override ids autocomplete from `tradingPreset`; augment the registry for custom app-wide ids. `keys.preset` replaces the preset. Confirmation controls inherit the default `confirm` and `cancel` keys if a replacement omits them. `keys.overrides` replaces each named command's entire key list. Values can come from storage: the layer calls `keyboard.parse` on each key, warns once for an invalid command override and retains that command's preset keys. An explicit empty list unbinds a command. `commands.setOverrides(next)` replaces all overrides, rebinds live scopes and calls `keys.onChange` with the validated overrides for optional app persistence.

`register(scope, commands, { parent, target, ignoreInputs, timeout, only })` activates a named scope and returns an idempotent unregister function. Give each scope one owner. Keyboard scope precedence chooses key handlers; a duplicate key within one scope warns with both command ids and keeps the first owner, including when disabled. `invoke(id, { scope?, event? })` uses the same descendant/latest scope policy, or selects an explicit active owner. Enabled predicates run on invocation and again on confirmation. Synchronous throws and rejected promises go to `reporter.error(cause, { source: "command", id })`. Already running commands are not cancelled by unregister or disposal.

For a key layer, register just the allowed commands in a separate scope with `{ only: true }`. This rebinds their keys in an exclusive scope until unregister. `global` cannot be an exclusive layer. `commands.keymap` exposes `get()` and `subscribe()` over entries containing `command`, `label`, optional `group`, `scope` and formatted `keys`. It follows registered scope lifetimes, shadows duplicate keys, omits hidden commands and publishes exclusive-layer and confirmation changes. Element-target focus changes also update the keymap; each registration releases its focus subscriptions on unregister. The keyboard port remains responsible for dispatch and key matching.

`commands.confirm` is a read-only store of `{ command, label, prompt, scope } | null`. A confirm command activates an exclusive scope with the preset's `confirm` keys (default y) and `cancel` keys (default n/Escape). `accept()` consumes pending intent before running; `cancel()` dismisses it. Confirmation also clears on owner unregister, override replacement and kernel disposal. Repeated keydown events cannot open or accept a confirmation. During confirmation the keymap contains its two controls. `createCommands({ ports, keys })` is available for owners outside a kernel and requires only keyboard, store and reporter interfaces; its owner must call `dispose()`.

`@densedash/core/conformance` exports `storeContract` and `runContract({ test, cases: storeContract, make })`. Each case calls `make()` for a fresh `StorePort`. The contract covers synchronous reads, notification order, batching and unsubscribe without importing a test runner. Store subscriptions run in registration order; `batch` publishes each changed store's final state once. Function-valued state is supported; use an updater such as `store.set(() => nextFunction)` to replace it.

The same entry exports `keyboardContract({ advanceTime })`. Run it with `runContract({ test, cases: keyboardContract({ advanceTime }), make })`, where `make()` returns a fresh keyboard port. Install DOM globals (for example Vitest's `happy-dom` environment), enable fake timers before each case, and pass `advanceTime: ms => { vi.advanceTimersByTime(ms); }`. The hook must advance both `Date.now()` and scheduled timers: Hotkeys owns sequence timing rather than using the kernel clock. Cases create and focus their DOM targets, dispatch synthetic keyboard events, and dispose ports in `finally`. They cover nested/recent scopes, exclusivity/allow, counted releases, timeout, pending progress, input filtering, enabled/handler updates and listener cleanup on element, document and window targets. No test-runner dependency is shipped.

New library packages can reuse `tooling/tsdown-config/index.ts` through a local `tsdown.config.ts` and copy the existing package build and validation scripts. Published packages use `type: module`, `dist/` exports with declarations, `sideEffects: false` and a `files` allowlist. Builds preserve source modules with `unbundle: true` and emit ESM only. Root tooling owns the pinned development dependencies.

## Tests and type work

Vitest discovers unit files named `*.test.ts` or `*.test.tsx` under packages, apps and examples. `pnpm test` runs these and type assertions in `*.test-d.ts` files. `pnpm test:types [file]` runs type assertions alone. Import `test` and `expectTypeOf` from `vitest` in a type assertion file. Empty test runs pass; this scaffold commits no tests.

The root tsconfig covers workspace TypeScript and extends `tooling/tsconfig/base.json`. It enables strict checking, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.

Run `pnpm build` before `pnpm type-budget`. The budget runs pinned TypeScript with `--extendedDiagnostics` over `tooling/type-bench/*.ts`, importing built declarations to measure the API consumers actually typecheck. Source implementations are checked separately by `pnpm typecheck`; Turbo orders type checking and type assertions after package builds so clean CI checkouts have those declarations. The gate fails on compiler errors, missing diagnostics, or more than 1,800 instantiations, as set in `budget.json`. Its workload grows with the API: `input.ts` exercises plugin and port inference, keyboard bindings, an augmented command registry, preset overrides, registration and invocation. Extend the workload as APIs arrive and explain any budget increase. Wall-clock time is diagnostic only, so machine speed does not determine the result.

## Release rehearsal

See [.changeset/README.md](.changeset/README.md) for the fixed release group and independent plugin versioning. CI validates packed package exports with publint and the ESM-only attw profile. That attw profile intentionally ignores CommonJS consumers; its ignored CommonJS diagnostic is expected for this ESM-only project. Vitest also prints its upstream experimental type-checking notice; its version is pinned.

The main release workflow can maintain version PRs. It has no publish command or npm credentials and creates no release tags. npm publication is a later ticket.
