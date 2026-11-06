import type { ReporterPort } from "@densedash/core";

type Observer = (command: string, run: () => void) => void;

let observer: Observer | undefined;

/**
 * Wraps every command the kernel runs, so the app can compare state before and after a key and
 * report what it did, including keys that change nothing. Returns a function that stops it.
 */
export function observeCommands(next: Observer): () => void {
  observer = next;
  return () => {
    if (observer === next) observer = undefined;
  };
}

/** The default reporter plus `trace`, which the kernel calls around each command. */
export const reporter: ReporterPort = {
  error: (cause, context) => console.error(cause, context),
  warn: (message) => console.warn(message),
  trace<A>(command: string, run: () => A): A {
    const current = observer;
    if (current === undefined) return run();
    let result: { readonly value: A } | undefined;
    current(command, () => {
      result = { value: run() };
    });
    if (result === undefined) throw new Error(`Command ${command} did not run.`);
    return result.value;
  },
};
