# DD-4 ticket contract

- Scope: one pure collections abstraction, about eight production files, under 700 lines; no split needed.
- Flatten: manually inspect flat, nested and collapsed rows with all nine required metadata fields.
- Navigation: scratch calls cover every move, counts, disabled rows, empty inputs and loop boundaries.
- Selection: scratch calls demonstrate toggle, anchored inclusive range, all and clear without input mutation.
- Reconciliation: scratch calls prove nearest old neighbour fallback, removed selection pruning and stable keys on prepend.
- Types/performance: compile inferred app item access with `tsc --noEmit`; time 10,000-row flatten plus move below 16 ms.
- Threat model: application-owned synchronous callbacks and typed inputs are trusted; duplicate keys and child cycles are programmer errors, including in collapsed branches, and must throw key-naming errors in linear time.
- Invariants: key identity owns state; traversal owns preorder metadata; disabled rows cannot be navigation/selection targets; app item inference uses ordinary generics.
- Ownership/effects: callers own source/state; each call owns only local arrays/sets; no input mutation, ambient state, clocks, retries, locks, cancellation or I/O.
- Non-goals: DOM, stores, keyboard handling, async children, components, kernel/ports/plugins and persistent tests (DD-17).
- Verification: targeted lint after each edit, manual scratch checks, build/lint/typecheck, packed exports, Changesets and type budget locally; full tests and frozen install only in provider CI per the run's testing rules.
