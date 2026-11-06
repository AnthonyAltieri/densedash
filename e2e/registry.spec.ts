import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const exec = promisify(execFile);
// pnpm 12 reads PNPM_CONFIG_*; legacy npm_config_* values come from worker setup.
const packageEnv = {
  ...process.env,
  npm_config_cache: process.env.npm_config_cache ?? join(tmpdir(), "densedash", "npm-cache"),
  PNPM_CONFIG_STORE_DIR:
    process.env.PNPM_CONFIG_STORE_DIR ??
    process.env.npm_config_store_dir ??
    join(tmpdir(), "densedash", "pnpm-store"),
  PNPM_CONFIG_CACHE_DIR:
    process.env.PNPM_CONFIG_CACHE_DIR ??
    process.env.npm_config_cache_dir ??
    join(tmpdir(), "densedash", "pnpm-cache"),
  PNPM_CONFIG_STATE_DIR:
    process.env.PNPM_CONFIG_STATE_DIR ??
    process.env.npm_config_state_dir ??
    join(tmpdir(), "densedash", "pnpm-state"),
};

for (const manager of ["npm", "pnpm"] as const) {
  test(`${manager}: a fresh registry tree install includes usable wrappers, CSS and published types`, async ({
    baseURL,
  }, testInfo) => {
    await mkdir(testInfo.outputDir, { recursive: true });
    const app = await mkdtemp(join(testInfo.outputDir, `${manager}-app-`));
    const controller = new AbortController();
    const run = async (command: string, args: string[]) => {
      try {
        return await exec(command, args, { cwd: app, env: packageEnv, signal: controller.signal });
      } catch (cause) {
        // Preserve the CLI's stdout/stderr in Playwright and CI failure reports.
        if (cause instanceof Error && "stdout" in cause && "stderr" in cause)
          throw new Error(`${command} ${args.join(" ")}\n${cause.stdout}\n${cause.stderr}`, {
            cause,
          });
        throw cause;
      }
    };
    try {
      await mkdir(join(app, "src"));
      // Prevent pnpm from adopting the repository workspace around this disposable app.
      if (manager === "pnpm") await writeFile(join(app, "pnpm-workspace.yaml"), "packages: []\n");
      await writeFile(
        join(app, "package.json"),
        JSON.stringify({
          name: "registry-consumer",
          packageManager: manager === "npm" ? "npm@10.9.3" : "pnpm@12.3.4",
          private: true,
          type: "module",
          dependencies: { react: "19.3.1" },
          devDependencies: { "@types/react": "19.3.0", typescript: "5.9.3" },
        }),
      );
      await writeFile(
        join(app, "components.json"),
        JSON.stringify({
          $schema: "https://ui.shadcn.com/schema.json",
          style: "new-york",
          rsc: false,
          tsx: true,
          tailwind: { config: "", css: "src/styles.css", baseColor: "neutral", cssVariables: true },
          aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui" },
          registries: { "@densedash": `${baseURL}/r/{name}.json` },
        }),
      );
      await writeFile(
        join(app, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "Bundler",
            jsx: "react-jsx",
            strict: true,
            exactOptionalPropertyTypes: true,
            noUncheckedIndexedAccess: true,
            verbatimModuleSyntax: true,
            skipLibCheck: true,
            noEmit: true,
            baseUrl: ".",
            paths: { "@/*": ["./src/*"] },
          },
          include: ["src"],
        }),
      );
      await writeFile(join(app, "src/styles.css"), "@import 'tailwindcss';\n");
      await writeFile(
        join(app, "src/consumer.tsx"),
        `
import { Tree, useTree } from "./components/densedash/tree.js";
import { Keymap } from "./components/densedash/keymap.js";

function Consumer() {
  const tree = useTree({ data: [{ id: "desk", label: "Desk" }], getRowId: (row) => row.id });
  return <Tree.Root tree={tree} aria-label="Desks"><Tree.Viewport tree={tree}>
    {(row) => <Tree.Row row={row}>{row.original.label}</Tree.Row>}
  </Tree.Viewport></Tree.Root>;
}
export function App() { return <Keymap.Provider><Consumer /></Keymap.Provider>; }
`,
      );
      await test.step("initialize the selected package manager", async () => {
        await run(manager, ["install"]);
      });
      await test.step("shadcn add from the local registry", async () => {
        const installed = await run(
          manager,
          manager === "npm"
            ? [
                "exec",
                "--yes",
                "--package=shadcn@4.23.0",
                "--",
                "shadcn",
                "add",
                "@densedash/tree",
                "--yes",
              ]
            : ["--yes", "dlx", "shadcn@4.23.0", "add", "@densedash/tree", "--yes"],
        );

        await testInfo.attach("shadcn-install", {
          body: installed.stdout + installed.stderr,
          contentType: "text/plain",
        });
      });
      await test.step("typecheck the installed wrappers and check their stylesheet", async () => {
        const dependencies = await run(manager, [
          "list",
          ...(manager === "npm" ? ["--all"] : ["--depth", "Infinity"]),
          "--json",
        ]);
        await testInfo.attach("installed-dependencies", {
          body: dependencies.stdout,
          contentType: "application/json",
        });
        await run("node", ["node_modules/typescript/bin/tsc", "--noEmit"]);
        await expect(
          readFile(join(app, "src/components/densedash/styles/tree.css"), "utf8"),
        ).resolves.toContain('[data-slot="tree-row"]');
        await expect(
          readFile(join(app, manager === "npm" ? "package-lock.json" : "pnpm-lock.yaml"), "utf8"),
        ).resolves.toContain("@densedash/react");
        const installed: unknown = JSON.parse(
          await readFile(join(app, "node_modules/@densedash/react/package.json"), "utf8"),
        );
        expect(installed).toMatchObject({ version: "0.2.0" });
      });
    } finally {
      controller.abort();
      await rm(app, { recursive: true, force: true });
    }
  });
}
