export interface ClockPort {
  now(): number;
  /** Returns an idempotent cancel function. */
  setTimeout(run: () => void, ms: number): () => void;
}
