import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { maxInstantiations } = JSON.parse(
  readFileSync(new URL("./budget.json", import.meta.url), "utf8"),
);
const result = spawnSync(
  process.execPath,
  [
    require.resolve("typescript/bin/tsc"),
    "--project",
    fileURLToPath(new URL("./tsconfig.json", import.meta.url)),
    "--extendedDiagnostics",
    "--pretty",
    "false",
  ],
  { encoding: "utf8" },
);

if (result.error) throw result.error;
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const match = /^Instantiations:\s+(\d+)$/m.exec(result.stdout);
if (!match) throw new Error("TypeScript did not report Instantiations.");
const instantiations = Number(match[1]);

if (instantiations > maxInstantiations) {
  console.error(`Type budget exceeded: ${instantiations} > ${maxInstantiations} instantiations.`);
  process.exit(1);
}

console.log(`Type budget passed: ${instantiations} <= ${maxInstantiations} instantiations.`);
