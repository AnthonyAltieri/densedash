# End-to-end checks

Run from the workspace root with the pinned Node/pnpm versions. Dependencies
are real: the browser projects use the built docs site, and the registry project
uses the local registry plus npm packages. Build first:

```sh
pnpm turbo run build --filter @densedash/docs
export PLAYWRIGHT_BROWSERS_PATH=/tmp/densedash/ms-playwright
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

CI installs both engines with `playwright install --with-deps chromium webkit`.
If local WebKit libraries are unavailable, run `pnpm test:e2e --project=chromium`
and leave WebKit verification to CI. Do not install system libraries locally.
Registry subprocesses keep npm/pnpm cache, store and state paths under
`/tmp/densedash` by default. Existing environment overrides are preserved,
including legacy worker `npm_config_*` paths translated to pnpm 12
`PNPM_CONFIG_*` variables.

`playwright.config.ts` starts `vite preview` for `@densedash/docs` on port 4170
and waits for its URL. It rejects an existing server to avoid testing a stale
build. Playwright stops the server at the end. No test starts a dev server.
The production build runs `registry:build` and copies `public/r` into its static
output, so `/r/{name}.json` serves the same generated registry as the docs site.

For a focused run:

```sh
pnpm test:e2e e2e/tree.spec.ts --project=chromium
pnpm test:e2e --project=chromium --project=webkit
pnpm test:e2e --project=registry
```

The five browser cases cover nested tree navigation, nested table sorting,
page-wide app-shell layers, key sequences and order confirmation. They wait
for attributes or visible text. The app-shell example has no input, so its test
adds a real DOM field to verify that typing bypasses all three key layers.
Confirmation clicks start with focus outside the example to exercise WebKit's
button-focus behavior.

The registry project runs once per package manager, independently of the
browser matrix. Each case creates a disposable app under Playwright's ignored
output directory, installs its React/TypeScript prerequisites, runs
`shadcn@4.23.0 add @densedash/tree`, and typechecks a component using the installed
Tree and Keymap wrappers. It checks the CSS, selected manager's lockfile and
installed React wrapper version. The app declares its package manager, and only
the pnpm app gets a workspace marker, to avoid inheriting the repository's pnpm
workspace or choosing pnpm for the npm case. Cleanup runs even after failure.
Install logs and dependency graphs are attached to the test report.

The consumer needs no bundler or TypeScript runner. The tests do not approve or
ignore dependency build scripts. Check the attached dependency graphs when
investigating a package manager's build-script failure.

Results and failure traces live in ignored `e2e/.results/`. CI uploads them on
failure. Each test owns its state; retries are disabled. CI runs the complete
suite three consecutive times as required by DD-70. Each run reports individual
browser and install durations, separate from the production build and browser
downloads.
