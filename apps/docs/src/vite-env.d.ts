/// <reference types="vite/client" />

declare module "virtual:densedash-previews" {
  import type { ComponentType } from "react";
  const previews: Record<
    string,
    {
      Component: ComponentType;
      source: string;
      html: string;
      hovers: { id: string; html: string }[];
      fileName: string;
    }
  >;
  export default previews;
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
