import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { transformerTwoslash } from "@shikijs/twoslash";
import { createHighlighter, createCssVariablesTheme } from "shiki";
import type { Plugin } from "vite";

const examplesDirectory = fileURLToPath(new URL("../registry/default/examples/", import.meta.url));
const moduleId = "virtual:densedash-previews";
const resolvedId = `\0${moduleId}`;

export function previewPlugin(): Plugin {
  return {
    name: "densedash-previews",
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      const highlighter = await createHighlighter({
        themes: [createCssVariablesTheme({ name: "densedash", variablePrefix: "--dd-code-" })],
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
          this.addWatchFile(path);
          const source = await readFile(path, "utf8");
          const html = highlighter.codeToHtml(source, {
            lang: "tsx",
            theme: "densedash",
            transformers: [
              transformerTwoslash({
                twoslashOptions: {
                  compilerOptions: { jsx: 4, strict: true, types: ["react"] },
                },
                // Attribute-based tooltips preserve code.textContent byte for byte.
                renderer: {
                  nodeStaticInfo(info, node) {
                    return {
                      type: "element",
                      tagName: "span",
                      properties: {
                        className: ["dd-type"],
                        "data-dd-type": info.text,
                        tabIndex: 0,
                        "aria-label": info.text,
                      },
                      children: [node],
                    };
                  },
                },
              }),
            ],
          });
          imports.push(`import Example${index} from ${JSON.stringify(path)};`);
          entries.push(
            `${JSON.stringify(file.slice(0, -4))}: { Component: Example${index}, source: ${JSON.stringify(source)}, html: ${JSON.stringify(html)}, fileName: ${JSON.stringify(file)} }`,
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
