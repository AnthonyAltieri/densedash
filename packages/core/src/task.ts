/** Host-owned cancellation interrupts work when the caller releases its lifetime. */
export type Task<A = void> = (signal: AbortSignal) => PromiseLike<A>;
