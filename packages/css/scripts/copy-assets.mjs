import { cp } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
await cp(new URL("../src/css.d.ts", import.meta.url), new URL("css.d.ts", dist));
await cp(new URL("../src/generated/", import.meta.url), dist, { recursive: true });
await cp(new URL("../src/components/", import.meta.url), new URL("components/", dist), {
  recursive: true,
});
