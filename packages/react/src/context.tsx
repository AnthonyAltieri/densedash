import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Kernel } from "@densedash/core";

const KernelContext = createContext<Kernel | null>(null);

export interface ProviderProps {
  /** The app owns the kernel and disposes it; the provider only exposes it. */
  readonly kernel: Kernel;
  readonly children?: ReactNode;
}

/** Puts an app-scoped kernel in context for every densedash part and hook below it. */
export function Provider({ kernel, children }: ProviderProps): ReactNode {
  return <KernelContext value={kernel}>{children}</KernelContext>;
}

/** Reads the kernel from the nearest `<Densedash.Provider>`; throws when there is none. */
export function useKernel(): Kernel {
  return useKernelFor("useKernel()");
}

export function useKernelFor(consumer: string): Kernel {
  const kernel = useContext(KernelContext);
  if (kernel === null) {
    throw new Error(
      `densedash: ${consumer} must be rendered inside <Densedash.Provider kernel={kernel}>.`,
    );
  }
  return kernel;
}
