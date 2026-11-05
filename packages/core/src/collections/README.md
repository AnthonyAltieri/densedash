# Deprecated collection snapshot types

The handwritten flattening, movement, reconciliation and selection exports have
been removed. [TanStack navigation](../navigation/README.md) owns the row engine.
`Key`, `TreeRow`, `TreeState` and the other compatibility types remain for the
existing React adapter until DD-30/DD-31. They describe projected TanStack rows;
they do not form an independent collection engine.
