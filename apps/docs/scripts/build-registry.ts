import { fileURLToPath } from "node:url";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Effect, FileSystem } from "effect";
import * as Schema from "effect/Schema";
import theme from "../../../packages/css/src/generated/css-vars.json" with { type: "json" };

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = `${appDirectory}public/r`;
const text = Schema.String.check(Schema.isMinLength(1));
const name = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
const file = Schema.Struct({
  path: text,
  type: Schema.Literals(["registry:file", "registry:ui"]),
  target: text,
});
const itemSchema = Schema.Struct({
  name,
  type: Schema.Literals(["registry:theme", "registry:ui"]),
  title: text,
  description: text,
  files: Schema.NonEmptyArray(file),
  dependencies: Schema.optionalKey(Schema.Array(text)),
  registryDependencies: Schema.optionalKey(Schema.Array(text)),
  cssVars: Schema.optionalKey(
    Schema.Struct({
      light: Schema.Record(Schema.String, text),
      dark: Schema.Record(Schema.String, text),
    }),
  ),
});
const manifestSchema = Schema.Struct({
  $schema: Schema.Literal("https://ui.shadcn.com/schema/registry.json"),
  name,
  homepage: text,
  items: Schema.NonEmptyArray(Schema.Unknown),
});
const parseOptions = { onExcessProperty: "error" } as const;

const buildRegistry = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  // A failed invocation must not leave an older registry available to publish.
  yield* fs.remove(outputDirectory, { recursive: true, force: true });

  const build = Effect.gen(function* () {
    const manifestText = yield* fs.readFileString(`${appDirectory}registry/registry.json`);
    const json = yield* Effect.try({
      try: (): unknown => JSON.parse(manifestText),
      catch: (cause) => new Error(`registry.json: ${String(cause)}`),
    });
    const manifest = yield* Schema.decodeUnknownEffect(manifestSchema, parseOptions)(json);
    const names = new Set<string>();
    const items = yield* Effect.forEach(manifest.items, (raw, index) =>
      Effect.gen(function* () {
        const label =
          typeof raw === "object" && raw !== null && "name" in raw
            ? String(raw.name)
            : `item at index ${index}`;
        const input =
          typeof raw === "object" && raw !== null && "type" in raw && raw.type === "registry:theme"
            ? { ...raw, ...theme }
            : raw;
        const item = yield* Schema.decodeUnknownEffect(
          itemSchema,
          parseOptions,
        )(input).pipe(
          Effect.mapError((cause) => new Error(`Registry item "${label}": ${String(cause)}`)),
        );
        if (names.has(item.name)) {
          return yield* Effect.fail(new Error(`Registry item "${item.name}": duplicate name`));
        }
        names.add(item.name);
        const files = yield* Effect.forEach(item.files, (entry) =>
          Effect.gen(function* () {
            const content = yield* fs
              .readFileString(`${appDirectory}${entry.path}`)
              .pipe(
                Effect.mapError(
                  (cause) =>
                    new Error(`Registry item "${item.name}" (${entry.path}): ${String(cause)}`),
                ),
              );
            return { ...entry, content };
          }),
        );
        return {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          ...item,
          files,
        };
      }),
    );

    for (const item of items) {
      for (const dependency of item.registryDependencies ?? []) {
        if (
          dependency.startsWith("@densedash/") &&
          !names.has(dependency.slice("@densedash/".length))
        ) {
          return yield* Effect.fail(
            new Error(`Registry item "${item.name}": missing dependency ${dependency}`),
          );
        }
      }
    }

    // Validate and read the entire catalog before creating any publishable output.
    yield* fs.makeDirectory(outputDirectory, { recursive: true });
    yield* Effect.forEach(items, (item) =>
      fs.writeFileString(
        `${outputDirectory}/${item.name}.json`,
        `${JSON.stringify(item, null, 2)}\n`,
      ),
    );
    yield* Effect.log(`Registry: wrote ${items.length} validated item(s) to public/r`);
  });

  yield* build.pipe(
    Effect.onError(() =>
      fs.remove(outputDirectory, { recursive: true, force: true }).pipe(Effect.orDie),
    ),
  );
});

NodeRuntime.runMain(buildRegistry.pipe(Effect.provide(NodeFileSystem.layer)));
