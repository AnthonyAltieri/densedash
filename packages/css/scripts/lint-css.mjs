import { readFile, readdir } from "node:fs/promises";
import { generate, ident, lexer, parse, walk } from "css-tree";

const directory = new URL("../src/components/", import.meta.url);
const files = await readdir(directory, { recursive: true });
let checked = 0;

for (const file of files.sort()) {
  if (!file.endsWith(".css")) continue;
  checked += 1;
  const source = await readFile(new URL(file, directory), "utf8");
  const report = (node, message) => {
    console.error(`src/components/${file}:${node.loc?.start.line ?? 1}: ${message}`);
    process.exitCode = 1;
  };

  try {
    const ast = parse(source, {
      positions: true,
      parseCustomProperty: true,
      onParseError(error) {
        throw error;
      },
    });
    ast.children.forEach((node) => {
      if (
        node.type !== "Atrule" ||
        node.name !== "layer" ||
        !node.block ||
        !node.prelude ||
        generate(node.prelude) !== "dd.components"
      ) {
        report(node, "Wrap component CSS in @layer dd.components { ... }.");
      }
    });

    walk(ast, {
      visit: "Declaration",
      enter(declaration) {
        if (declaration.property.startsWith("--")) {
          report(declaration, "Define tokens in src/tokens.ts, never in component CSS.");
        }
        if (declaration.important) {
          report(
            declaration,
            "Remove !important so application styles can override the component.",
          );
        }
        walk(declaration.value, (node) => {
          if (node.type === "Function" && node.name.toLowerCase() === "var") {
            const name = node.children.first;
            if (name?.type !== "Identifier" || !ident.decode(name.name).startsWith("--dd-")) {
              report(node, "Use a --dd-* variable.");
            }
          }
          // A bare zero (`top: 0`) is a position, not a design value.
          const zero = node.type === "Number" && Number(node.value) === 0;
          const literal =
            !zero && ["Dimension", "Percentage", "Number", "Hash", "Raw"].includes(node.type);
          const color =
            node.type === "Identifier" &&
            lexer.matchType("color", ident.decode(node.name)).matched !== null;
          if (literal || color) {
            report(node, `Replace literal ${generate(node)} with a --dd-* variable.`);
          }
        });
      },
    });
  } catch (error) {
    console.error(`src/components/${file}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.log(`Checked ${checked} component CSS files.`);
