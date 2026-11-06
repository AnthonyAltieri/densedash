import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultHoverInfoProcessor, transformerTwoslash } from "@shikijs/twoslash";
import { createHighlighter, createCssVariablesTheme } from "shiki";
import ts from "typescript";
import { createTwoslasher } from "twoslash";
import type { Plugin } from "vite";

const examplesDirectory = fileURLToPath(new URL("../registry/default/examples/", import.meta.url));
/** Docs-only helpers the examples import; their types appear in the examples' hovers. */
const helpersDirectory = fileURLToPath(new URL("../registry/default/docs/", import.meta.url));
/** Maps each example name to a loader for its own module, so a page downloads only its examples. */
const indexId = "virtual:densedash-previews";
/** One module per example: the component, its source, highlighted code and type hovers. */
const examplePrefix = "virtual:densedash-preview/";
const theme = "densedash";

interface Example {
  path: string;
  file: string;
  source: string;
  html: string;
  hovers: { id: string; html: string }[];
}

async function exampleFiles(): Promise<string[]> {
  return (await readdir(examplesDirectory)).filter((file) => file.endsWith(".tsx")).sort();
}

/** Highlights every example once; each example module reads its entry. */
async function renderExamples(): Promise<Map<string, Example>> {
  const highlighter = await createHighlighter({
    themes: [createCssVariablesTheme({ name: theme, variablePrefix: "--dd-code-" })],
    langs: ["tsx"],
  });
  // The virtual example file lives beside the real examples so sibling wrapper imports
  // resolve to the exact registry sources. The transformer forwards only execution options.
  const twoslasher = createTwoslasher({ vfsRoot: examplesDirectory, fsCache: false });
  try {
    const examples = new Map<string, Example>();
    for (const file of await exampleFiles()) {
      const path = `${examplesDirectory}${file}`;
      const name = file.slice(0, -4);
      const source = await readFile(path, "utf8");
      const typeInfo: { id: string; text: string }[] = [];
      const html = highlighter.codeToHtml(source, {
        lang: "tsx",
        theme,
        transformers: [
          transformerTwoslash({
            twoslasher,
            twoslashOptions: {
              compilerOptions: {
                jsx: ts.JsxEmit.ReactJSX,
                module: ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                target: ts.ScriptTarget.ES2022,
                strict: true,
                exactOptionalPropertyTypes: true,
                noUncheckedIndexedAccess: true,
                skipLibCheck: true,
                types: ["react"],
              },
            },
            // The token only references its hover by id. Hover content renders
            // outside the code element, so code.textContent stays byte for byte.
            renderer: {
              nodeStaticInfo(info, node) {
                const text = defaultHoverInfoProcessor(info.text) || info.text.trim();
                if (!text) return node;
                const hoverId = `dd-type-${name}-${typeInfo.length}`;
                typeInfo.push({ id: hoverId, text });
                return {
                  type: "element",
                  tagName: "span",
                  properties: {
                    dataSlot: "type-token",
                    dataDdHover: hoverId,
                    ariaDescribedBy: [hoverId],
                    tabIndex: 0,
                  },
                  children: [node],
                };
              },
            },
          }),
        ],
      });
      const hovers = typeInfo.map(({ id: hoverId, text }) => ({
        id: hoverId,
        html: highlighter.codeToHtml(text, { lang: "tsx", theme }),
      }));
      examples.set(name, { path, file, source, html, hovers });
    }
    return examples;
  } finally {
    highlighter.dispose();
  }
}

export function previewPlugin(): Plugin {
  // Shared by the client and server builds; reset when an example changes.
  let rendered: Promise<Map<string, Example>> | undefined;
  return {
    name: "densedash-previews",
    resolveId(id) {
      if (id === indexId || id.startsWith(examplePrefix)) return `\0${id}`;
    },
    async load(id) {
      if (id === `\0${indexId}`) {
        const loaders = (await exampleFiles()).map((file) => {
          const name = file.slice(0, -4);
          const moduleId = JSON.stringify(`${examplePrefix}${name}`);
          return `${JSON.stringify(name)}: () => import(${moduleId})`;
        });
        return `export default { ${loaders.join(",\n")} };`;
      }
      if (!id.startsWith(`\0${examplePrefix}`)) return;
      const name = id.slice(examplePrefix.length + 1);
      rendered ??= renderExamples();
      const example = (await rendered).get(name);
      if (!example) {
        rendered = undefined;
        this.error(`Unknown component preview: ${name}`);
      }
      this.addWatchFile(example.path);
      return [
        `import Component from ${JSON.stringify(example.path)};`,
        `export default { Component, source: ${JSON.stringify(example.source)}, html: ${JSON.stringify(example.html)}, hovers: ${JSON.stringify(example.hovers)}, fileName: ${JSON.stringify(example.file)} };`,
      ].join("\n");
    },
    handleHotUpdate({ file, server }) {
      const example = file.startsWith(examplesDirectory) && file.endsWith(".tsx");
      const helper = file.startsWith(helpersDirectory) && /\.tsx?$/.test(file);
      if (example || helper) {
        rendered = undefined;
        for (const module of server.moduleGraph.idToModuleMap.values()) {
          if (module.id?.startsWith(`\0${examplePrefix}`) || module.id === `\0${indexId}`) {
            server.moduleGraph.invalidateModule(module);
          }
        }
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}
