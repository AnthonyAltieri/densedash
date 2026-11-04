# Releases

Run `pnpm changeset` when a publishable package changes. Describe the user-visible change and select its bump.

`@densedash/core`, `@densedash/css` and `@densedash/react` form one exact-name `fixed` group in [config.json](./config.json). They always release at the same version. `@densedash/plugin-*` packages version independently: leave them outside `fixed` and `linked`, and add a changeset for the plugin being changed.

`pnpm changeset status` inspects the release plan. `pnpm version-packages` applies pending changesets and formats the result.

On pushes to main, [the release workflow](../.github/workflows/release.yml) runs Changesets to maintain a version PR. Merging that PR runs `pnpm release` in CI: it builds the workspace, publishes unpublished package versions to npm with provenance, and creates package tags and GitHub releases from the generated changelogs. The workflow owns the npm credentials and OIDC permission; the source repository must be public for npm provenance. Never run `pnpm release` or `changeset publish` locally.
