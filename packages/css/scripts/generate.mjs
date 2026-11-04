import { mkdir, readFile, writeFile } from "node:fs/promises";
import { format } from "oxfmt";
import { tokens } from "../src/tokens.ts";

const check = process.argv.includes("--check");
const outputDirectory = new URL("../src/generated/", import.meta.url);
const defaultSizes = tokens.density[tokens.defaults.density];
const shared = { ...tokens.base, ...tokens.components, ...defaultSizes };

function declarations(values) {
  return Object.entries(values)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");
}

const darkDeclarations = declarations(tokens.themes.dark);
const densityBlocks = Object.entries(tokens.density).map(
  ([name, sizes]) => `[data-dd-density="${name}"] { ${declarations(sizes)} }`,
);
const css = `/* Generated from src/tokens.ts. Do not edit. */
@layer dd.tokens, dd.base, dd.components;
@layer dd.tokens {
  :root {
    ${declarations(shared)}
    ${declarations(tokens.themes.light)}
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      ${darkDeclarations}
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    ${darkDeclarations}
    color-scheme: dark;
  }
  ${densityBlocks.join("\n")}
}
`;

// shadcn keys omit the leading --. Shared values live in each theme's :root
// variables, rather than Tailwind's @theme, so no Tailwind plugin is required.
const cssVars = Object.fromEntries(
  Object.entries(tokens.themes).map(([theme, colors]) => [
    theme,
    Object.fromEntries(
      Object.entries({ ...shared, ...colors }).map(([key, value]) => [key.slice(2), value]),
    ),
  ]),
);

const rows = [
  ...Object.entries(tokens.base).map(([name, value]) => ({ name, tier: "base", value })),
  ...Object.entries(tokens.themes.light).map(([name, light]) => ({
    name,
    tier: "semantic",
    light,
    dark: tokens.themes.dark[name],
  })),
  ...Object.entries(tokens.components).map(([name, value]) => ({ name, tier: "component", value })),
  ...Object.entries(tokens.density.compact).map(([name, compact]) => ({
    name,
    tier: "component",
    compact,
    comfortable: tokens.density.comfortable[name],
  })),
];

const sources = new Map([
  ["tokens.css", css],
  ["css-vars.json", JSON.stringify({ cssVars })],
  ["tokens.json", JSON.stringify({ defaults: tokens.defaults, tokens: rows })],
]);
const outputs = new Map();
for (const [name, source] of sources) {
  const formatted = await format(name, source);
  if (formatted.errors.length > 0) {
    throw new Error(`Cannot format ${name}: ${JSON.stringify(formatted.errors)}`);
  }
  outputs.set(name, formatted.code);
}

if (check) {
  for (const [name, expected] of outputs) {
    const actual = await readFile(new URL(name, outputDirectory), "utf8").catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (actual !== expected) {
      console.error(`${name} is stale or missing. Run pnpm --filter @densedash/css generate.`);
      process.exitCode = 1;
    }
  }
} else {
  await mkdir(outputDirectory, { recursive: true });
  for (const [name, content] of outputs) {
    await writeFile(new URL(name, outputDirectory), content);
  }
  console.log(`Generated ${outputs.size} token files from src/tokens.ts.`);
}
