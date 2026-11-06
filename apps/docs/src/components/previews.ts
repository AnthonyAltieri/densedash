import loaders from "virtual:densedash-previews";
import type { Preview } from "virtual:densedash-previews";

/** A promise React's `use` reads synchronously once it has settled. */
type Tracked<T> = Promise<T> & {
  status?: "pending" | "fulfilled" | "rejected";
  value?: T;
  reason?: unknown;
};

const cache = new Map<string, Tracked<Preview>>();

/**
 * Loads one example's module once per page session. Route loaders await it, so
 * server rendering and client navigation find it settled and render without
 * suspending; during hydration the server HTML stays until the module arrives.
 */
export function loadPreview(name: string): Promise<Preview> {
  const cached = cache.get(name);
  if (cached) return cached;
  const load = loaders[name];
  if (!load) throw new Error(`Unknown component preview: ${name}`);
  const preview: Tracked<Preview> = load().then((module) => module.default);
  preview.status = "pending";
  preview.then(
    (value) => {
      preview.status = "fulfilled";
      preview.value = value;
    },
    (reason: unknown) => {
      preview.status = "rejected";
      preview.reason = reason;
      cache.delete(name);
    },
  );
  cache.set(name, preview);
  return preview;
}

/** Route loaders call this with the examples their page renders. */
export async function loadPreviews(names: readonly string[]): Promise<void> {
  await Promise.all(names.map(loadPreview));
}
