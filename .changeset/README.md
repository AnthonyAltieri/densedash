# Releases

Run `pnpm changeset` when a publishable package changes. Describe the user-visible change and select its bump.

`@densedash/core`, `@densedash/css` and `@densedash/react` form one exact-name `fixed` group in [config.json](./config.json). They always release at the same version. Future `@densedash/plugin-*` packages version independently: leave them outside `fixed` and `linked`, and add a changeset for the plugin being changed. No plugin package exists yet.

`pnpm changeset status` inspects the release plan. `pnpm version-packages` applies pending changesets and formats the result.

On pushes to main, [the release workflow](../.github/workflows/release.yml) runs Changesets to maintain a version PR. This is a release rehearsal: the action has no `publish-script` input, creates no GitHub releases or tags, and receives no npm credentials. It cannot publish packages. Enabling npm publication after the organization exists is a later ticket.
