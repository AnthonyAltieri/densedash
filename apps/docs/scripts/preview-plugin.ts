import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultHoverInfoProcessor, transformerTwoslash } from "@shikijs/twoslash";
import { createHighlighter, createCssVariablesTheme } from "shiki";
import type { Plugin } from "vite";

const examplesDirectory = fileURLToPath(new URL("../registry/default/examples/", import.meta.url));
const moduleId = "virtual:densedash-previews";
const resolvedId = `\0${moduleId}`;
const theme = "densedash";

export function previewPlugin(): Plugin {
  return {
    name: "densedash-previews",
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      const highlighter = await createHighlighter({
        themes: [createCssVariablesTheme({ name: theme, variablePrefix: "--dd-code-" })],
        langs: ["tsx"],
      });
      try {
        const files = (await readdir(examplesDirectory))
          .filter((file) => file.endsWith(".tsx"))
          .sort();
        const imports: string[] = [];
        const entries: string[] = [];
        for (const [index, file] of files.entries()) {
          const path = `${examplesDirectory}${file}`;
          const name = file.slice(0, -4);
          this.addWatchFile(path);
          const source = await readFile(path, "utf8");
          const typeInfo: { id: string; text: string }[] = [];
          const html = highlighter.codeToHtml(source, {
            lang: "tsx",
            theme,
            transformers: [
              transformerTwoslash({
                twoslashOptions: {
                  compilerOptions: { jsx: 4, strict: true, types: ["react"] },
                },
                // The token only references its hover by id. Hover content renders
                // outside the code element, so code.textContent stays byte for byte.
                renderer: {
                  nodeStaticInfo(info, node) {
                    const hoverId = `dd-type-${name}-${typeInfo.length}`;
                    typeInfo.push({ id: hoverId, text: defaultHoverInfoProcessor(info.text) });
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
          imports.push(`import Example${index} from ${JSON.stringify(path)};`);
          entries.push(
            `${JSON.stringify(name)}: { Component: Example${index}, source: ${JSON.stringify(source)}, html: ${JSON.stringify(html)}, hovers: ${JSON.stringify(hovers)}, fileName: ${JSON.stringify(file)} }`,
          );
        }
        return `${imports.join("\n")}\nexport default { ${entries.join(",\n")} };`;
      } finally {
        highlighter.dispose();
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(examplesDirectory) && file.endsWith(".tsx")) {
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}
