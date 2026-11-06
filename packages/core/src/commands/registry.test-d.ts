import { expectTypeOf, test } from "vitest";
import { createKernel } from "@densedash/core";
import type {
  Command,
  CommandId,
  KeyboardHotkey,
  KeysOptions,
  Preset,
  ValidatedKeyOverrides,
} from "@densedash/core";
import type { CommandId as BareCommandId } from "@densedash/core/bare";

declare module "@densedash/core" {
  interface Register {
    commands: { "app.open": unknown; "app.refresh": unknown };
  }
}

test("Register constrains definitions and command calls through both public entries", () => {
  expectTypeOf<BareCommandId>().toEqualTypeOf<CommandId>();
  const kernel = createKernel();
  kernel.commands.register("page", [{ id: "app.open", label: "Open", run() {} }]);
  kernel.commands.invoke("app.refresh");
  kernel.commands.keys("tree.next");
  // @ts-expect-error Augmented command definitions reject unregistered ids.
  const invalid: Command = { id: "app.typo", label: "Typo", run() {} };
  void invalid;
  // @ts-expect-error Invocation uses the same registry as command definitions.
  kernel.commands.invoke("app.typo");
  // @ts-expect-error Key lookup cannot bypass the registry.
  kernel.commands.keys("app.typo");
});

test("presets reject misspelled chords and sequence steps", () => {
  const preset = { "app.open": ["Mod+K", ["G", "H"]] } as const satisfies Preset;
  createKernel({ keys: { preset } });
  // @ts-expect-error A chord must use checked keyboard syntax.
  const invalidChord: Preset = { "app.open": ["NotAKey"] };
  // @ts-expect-error Each sequence step must use checked keyboard syntax.
  const invalidSequence: Preset = { "app.open": [["G", "NotAKey"]] };
  void [invalidChord, invalidSequence];
});

test("validated overrides keep checked keys while persisted input remains unknown", () => {
  const overrides = { "app.open": ["Enter", ["G", "H"]] } as const satisfies ValidatedKeyOverrides;
  createKernel({
    keys: {
      overrides,
      onChange(next) {
        expectTypeOf(next["app.open"]).toEqualTypeOf<readonly KeyboardHotkey[] | undefined>();
      },
    },
  });
  // @ts-expect-error Validated overrides must not widen key strings.
  const invalid: ValidatedKeyOverrides = { "app.open": ["NotAKey"] };
  void invalid;
  expectTypeOf<NonNullable<KeysOptions["overrides"]>["app.open"]>().toBeUnknown();
});

test("override ids reject typos even through generic kernel options", () => {
  const kernel = createKernel({ keys: { overrides: { "app.open": [], "tree.next": ["J"] } } });
  kernel.commands.setOverrides({ "app.refresh": ["R"] });
  // @ts-expect-error The generic kernel factory must retain excess-id checking.
  createKernel({ keys: { overrides: { "app.open": [], "app.typo": [] } } });
  // @ts-expect-error Replacing overrides must use registered or built-in ids.
  kernel.commands.setOverrides({ "app.typo": [] });
});
