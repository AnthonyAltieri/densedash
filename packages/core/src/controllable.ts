export interface ChangeDetails<Reason> {
  readonly reason: Reason;
  readonly event: Event | undefined;
  cancel(): void;
  readonly canceled: boolean;
}

/** Shared component props for controlled or internally managed values. */
export interface Controllable<T, Reason> {
  value?: T;
  defaultValue?: T;
  onChange?(value: T, details: ChangeDetails<Reason>): void;
}
