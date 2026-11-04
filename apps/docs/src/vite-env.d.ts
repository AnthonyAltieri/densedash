/// <reference types="vite/client" />

declare module "virtual:densedash-previews" {
  import type { ComponentType } from "react";
  const previews: Record<
    string,
    { Component: ComponentType; source: string; html: string; fileName: string }
  >;
  export default previews;
}
