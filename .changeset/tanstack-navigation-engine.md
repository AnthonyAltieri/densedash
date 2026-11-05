---
"@densedash/core": minor
---

Breaking 0.2.0 migration: replace the handwritten tree and collection row engine with @tanstack/table-core 9.3.1. TanStack now owns row identity, nesting, sorting, filtering, expansion, selection and column state. The exported navigationFeature and createNavigableTable retain densedash cursor navigation, commands, typeahead, focus strategy and ARIA props.

Remove the collection flatten/move/reconcile/selection exports. Keep createTree and collection snapshot types as deprecated adapters for DD-30/DD-31. Expand on an already expanded row or a leaf is now a no-op. React and CSS follow core in the fixed release group. This uses Changesets' minor level because the approved breaking pre-1.0 release is 0.2.0.
