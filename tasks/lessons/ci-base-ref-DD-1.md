# CI base refs

Pass a fetched remote base ref explicitly to Changesets in detached CI checkouts, because full history does not create a local main branch. Keep full history and use `--since origin/main` as in [ci.yml](../../.github/workflows/ci.yml).
