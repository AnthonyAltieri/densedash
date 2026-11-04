# Docs

The private TanStack Start app hosts the docs overview and shadcn registry.
Run commands from the repository root:

```sh
pnpm --filter @densedash/docs dev
pnpm --filter @densedash/docs registry:build
pnpm turbo run build lint typecheck
```

The dev server defaults to port 3000. Pass `--port 4173` to the dev command
to choose another port. The install command shown on the overview uses the
default localhost address; adjust it if the server uses another port.
Build output lives in `dist/client` and `dist/server`. Hosting is deferred.

## Live examples

Add a default-exported React component at
`registry/default/examples/<name>.tsx`, then render
`<ComponentPreview name="<name>" />`. The Vite preview plugin discovers the
examples and imports each component from the same path it reads for source.
It runs Shiki and twoslash at compilation time, disposes the highlighter, and
sends only HTML, source, and component code to the browser. Example edits
invalidate the generated module and reload the page in development.

Keep examples self-contained for twoslash's TypeScript environment.
Type errors fail compilation. Hover or focus an underlined symbol to inspect
its inferred type. Tooltip text lives in an attribute, so the code element's
text content preserves the entire file, including the trailing newline.

The placeholder is a docs example, not a published component API. The registry
installs its TSX source without styles. The docs style its `data-slot` and
`data-state` attributes with plain CSS and `--dd-*` variables.

## Registry

`registry/registry.json` is the input. The Effect 4 pipeline validates the
manifest and every item, reads all referenced source files, then writes
`public/r/<name>.json` with embedded file content. Dev and production build
commands run it first. Re-run `registry:build` after editing registry content
while a dev server is running.

The supported shadcn subset is intentionally small:

- Manifest: `$schema`, `name`, `homepage`, and a nonempty `items` array.
- Item: unique lowercase kebab-case `name`, `type: "registry:file"`,
  nonempty `title`, `description`, and `files`.
- File: nonempty `path`, `type: "registry:file"`, and required `target`.
  Paths are relative to this app. The builder adds `content` from disk.

Unsupported fields fail validation. Extend the schema deliberately before
adding other registry types or metadata. Effect's core validation API is
`effect/Schema`; the lowercase `effect/schema` entry point groups additional
schema utilities in Effect 4.1.2.

One build invocation owns `public/r`. It removes old output before validation
and cleans up on failure, including write failures. Builds exit nonzero with
the item name on an invalid item or missing source file. Do not run concurrent
registry builds in one checkout. Generated output is ignored by git and is
included in the app's Turbo build outputs.

With the server running and a React/Tailwind app initialized with shadcn:

```sh
pnpm dlx shadcn@4.23.0 add http://localhost:3000/r/placeholder.json
```

## Theme, density, and workspace checks

The document's `<html>` owns `data-theme="light|dark"` and
`data-dd-density="compact|comfortable"`. Defaults are light and compact.
The header controls update React state and those attributes; preferences last
for the current page session. CSS responds directly to the attributes.

The app extends the shared strict TypeScript config without relaxing it.
Root TypeScript also checks the app. The generated route tree is committed
so checks work before the first Vite invocation.
Root tooling owns build dependencies. Runtime dependencies belong to this
private package, including Effect. Published packages do not depend on Effect.
Changesets already disables private-package versioning and tagging, so this
app does not need a release entry. CI runs the existing workspace gates.
Automated docs checks are deferred to DD-17; this scaffold adds no tests.
