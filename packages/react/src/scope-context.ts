import { createContext } from "react";

export interface ScopeContextValue {
  readonly name: string;
  /** Null until the scope's element mounts; registrations wait for it. */
  readonly element: HTMLElement | null;
}

export const ScopeContext = createContext<ScopeContextValue | null>(null);
