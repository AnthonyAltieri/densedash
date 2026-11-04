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

The workspace globs already include apps, nested examples and tooling. Applications and examples have no packages yet. The three package stubs each export a version constant. There are no components or adapter dependencies yet.

New library packages can reuse `tooling/tsdown-config/index.ts` through a local `tsdown.config.ts` and copy the existing package build and validation scripts. Published packages use `type: module`, `dist/` exports with declarations, `sideEffects: false` and a `files` allowlist. Builds preserve source modules with `unbundle: true` and emit ESM only. Root tooling owns the pinned development dependencies.

## Tests and type work

Vitest discovers unit files named `*.test.ts` or `*.test.tsx` under packages, apps and examples. `pnpm test` runs these and type assertions in `*.test-d.ts` files. `pnpm test:types [file]` runs type assertions alone. Import `test` and `expectTypeOf` from `vitest` in a type assertion file. Empty test runs pass; this scaffold commits no tests.

The root tsconfig covers workspace TypeScript and extends `tooling/tsconfig/base.json`. It enables strict checking, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.

`pnpm type-budget` runs pinned TypeScript with `--extendedDiagnostics` over `tooling/type-bench/*.ts`. It fails on compiler errors, missing diagnostics, or more than 1,000 instantiations, as set in `budget.json`. The initial workload is 14 instantiations. The headroom lets early APIs grow while catching runaway recursive types. Extend `input.ts` to exercise public API inference as real APIs arrive. Review the workload and explain any budget increase together. Wall-clock time is diagnostic only, so machine speed does not determine the result.

## Release rehearsal

See [.changeset/README.md](.changeset/README.md) for the fixed release group and independent plugin versioning. CI validates packed package exports with publint and the ESM-only attw profile. That attw profile intentionally ignores CommonJS consumers; its ignored CommonJS diagnostic is expected for this ESM-only project. Vitest also prints its upstream experimental type-checking notice; its version is pinned.

The main release workflow can maintain version PRs. It has no publish command or npm credentials and creates no release tags. npm publication is a later ticket.
