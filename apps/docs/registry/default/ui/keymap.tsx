"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createKernel } from "@densedash/core";
import type { Kernel, KeysOptions } from "@densedash/core";
import { Densedash, Keymap as Parts } from "@densedash/react";
import "./styles/tokens.css";
import "./styles/kbd.css";
import "./styles/keymap-scope.css";
import "./styles/keymap-legend.css";
import "./styles/keymap-chord-hint.css";
import "./styles/keymap-confirm-prompt.css";

// Keep keys stable (module-level or memoized). This provider owns one browser kernel.
function Provider({ keys, children }: { keys?: KeysOptions; children?: ReactNode }) {
  const [kernel, setKernel] = useState<Kernel | null>(null);
  useEffect(() => {
    const created = createKernel(keys === undefined ? {} : { keys });
    setKernel(created);
    return () => created.dispose();
  }, [keys]);
  return kernel === null ? null : (
    <Densedash.Provider kernel={kernel}>{children}</Densedash.Provider>
  );
}

export const Keymap = { ...Parts, Provider };
export { useCommands, useKernel } from "@densedash/react";
