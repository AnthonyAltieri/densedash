# Docs

The private TanStack Start app hosts the docs overview and shadcn registry.
Run commands from the repository root:

```sh
pnpm --filter @densedash/docs dev
pnpm --filter @densedash/docs registry:build
pnpm turbo run build lint typecheck
```

The dev server defaults to port 3000. Pass `--port 4173` to the dev command
to choose another port. The overview's install command uses the public
production registry. Use the localhost command below to install local changes.

## Hosting

Production: <https://densedash-docs.vercel.app>. The Vercel Git integration
deploys pushes to `main` to production and gives each pull request a preview
deployment and a Vercel check. Merge through GitHub after CI and the preview
check pass. No deployment token belongs in the repository.

Repository configuration:

- `vite.config.ts` registers `nitro({ preset: "vercel" })` after the Start
  plugin. Start 1.169.4 has no hosting `target` option; the
  [Nitro Vite plugin](https://vercel.com/docs/frameworks/full-stack/tanstack-start)
  adapts its server for Vercel. The explicit preset also makes local builds
  produce the deployment format.
- `package.json` pins the build adapter to `nitro@3.0.260903-beta`, whose Node
  engine supports the repository's Node 22.20.0 CI runtime. Newer Nitro release
  candidates require Node 22.22.0. The build command remains
  `pnpm registry:build && vite build`: validation must succeed before the app
  is built. A failed registry invocation removes `public/r` and exits nonzero,
  so Vercel fails the deployment and keeps the previous successful deployment.
- Nitro emits `.vercel/output/config.json`, static assets under
  `.vercel/output/static/` (including `r/placeholder.json`), and a serverless
  function under `.vercel/output/functions/__server.func/`. Intermediate Vite
  files live in `node_modules/.nitro/`. No output-directory override or
  `vercel.json` is needed.
- `turbo.json` in this app caches `dist/**`, `.vercel/output/**`, and
  `public/r/**` together. The root `turbo.json` declares
  `ENABLE_EXPERIMENTAL_COREPACK` in `globalEnv` to prevent Vercel's environment
  warning. Only the install step needs that variable.
- The root `package.json` pins `pnpm@12.3.4` through `packageManager`.
  The committed `pnpm-lock.yaml` fixes dependency resolution.
- The root `.gitignore` excludes `.vercel/`, `node_modules/`, `dist/`, and
  `apps/docs/public/r/`. Generated registry and deployment files stay out of git.

Vercel dashboard configuration, outside the repository:

| Setting                                     | Value                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Project                                     | `densedash-docs` (`prj_H5fyuOmRbPxQaelzsrzAlKhACjwq`)                         |
| Team                                        | `anthonyaltieri's projects`                                                   |
| Git repository                              | `AnthonyAltieri/densedash`                                                    |
| Production branch                           | `main`                                                                        |
| Root Directory                              | `apps/docs`                                                                   |
| Include source files outside Root Directory | Enabled, for workspace packages and root tooling                              |
| Framework preset                            | `tanstack-start`                                                              |
| Node.js version                             | `22.x`                                                                        |
| Environment variable                        | `ENABLE_EXPERIMENTAL_COREPACK=1`, production, preview, and development        |
| Install command                             | Default, Corepack uses the pinned pnpm                                        |
| Build command                               | Default, Vercel detects Turbo and runs `turbo build`                          |
| Output Directory                            | Default, Nitro supplies the Vercel Build Output API files                     |
| Preview deployments                         | Enabled for pull requests through the Git integration                         |
| Deployment Protection                       | Vercel Authentication on preview/deployment URLs; production domain is public |

Inspect these settings with `vercel api /v9/projects/densedash-docs`.
To recreate the project, import the repository in Vercel with the settings
above. For protected previews, `vercel curl /r/placeholder.json --deployment
<preview-url>` uses the logged-in CLI. A downstream CLI such as shadcn needs
an authorized protection bypass when checking a protected preview; never
commit that credential. Production installs need no authentication:

```sh
pnpm dlx shadcn@4.23.0 add https://densedash-docs.vercel.app/r/placeholder.json
```

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
its inferred type; Escape hides it. The plugin highlights each type with the
same Shiki theme as the code and emits it as a separate `popover` element
outside the code element. Each token references its hover by id, so the code
element's text content preserves the entire file, including the trailing
newline. The preview shows the hover in the top layer, positioned against the
token and kept inside the viewport, so the code panel's overflow never clips it.

Each preview starts side by side; its toolbar switches to Preview and Code
tabs (arrow keys move between tabs). The choice is the preview's
`data-layout="split|tabs"` and `data-tab="preview|code"` attributes, held in
component state for the current page. Below 1000px side by side stacks the
preview above the code.

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
