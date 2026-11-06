/// <reference types="vite/client" />

declare module "virtual:densedash-previews" {
  import type { ComponentType } from "react";
  /** One example's module: its component, source, highlighted code and type hovers. */
  export interface Preview {
    Component: ComponentType;
    source: string;
    html: string;
    hovers: { id: string; html: string }[];
    fileName: string;
  }
  /** Loads each example's module on demand, so a page downloads only its own examples. */
  const loaders: Record<string, () => Promise<{ default: Preview }>>;
  export default loaders;
}

declare module "virtual:densedash-reference" {
  interface Token {
    name: string;
    tier: string;
    value?: string;
    light?: string;
    dark?: string;
    compact?: string;
    comfortable?: string;
  }
  const reference: {
    css: Record<string, Token[]>;
    keys: { command: string; keys: string[] }[];
  };
  export default reference;
}
