import { version as coreVersion } from "../../packages/core/src/index.js";
import { version as cssVersion } from "../../packages/css/src/index.js";
import { version as reactVersion } from "../../packages/react/src/index.js";

export type PackageSurface = {
  core: typeof coreVersion;
  css: typeof cssVersion;
  react: typeof reactVersion;
};

type Columns<Row> = {
  [Key in keyof Row]: { key: Key; value: Row[Key] };
}[keyof Row];

export type SampleColumn = Columns<{ id: string; count: number; enabled: boolean }>;
