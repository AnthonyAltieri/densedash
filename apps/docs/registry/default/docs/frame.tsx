// Docs-only presentation helper that every example is drawn inside. Not part of the registry.
import { useEffect, useId, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createKernel } from "@densedash/core";
import type { Kernel } from "@densedash/core";
import { Densedash } from "@densedash/react";
import { Footer } from "../ui/footer.js";
import "./frame.css";

/** The page layouts in frame.css, one per example that needs more than the plain card. */
export type FrameVariant = "tree" | "list" | "nested-list" | "table" | "tabs" | "keymap" | "footer";

export interface FrameProps {
  /** The card's title, at the start of its header. */
  readonly title: string;
  /**
   * At the end of the header: a number reads as `N rows`, a string as written. It describes the
   * children, so it shows once they render in the browser.
   */
  readonly count?: number | string | undefined;
  /** Text at the end of the footer, such as what the example last did. */
  readonly status?: ReactNode;
  /**
   * Draws the footer with the live key legend. Defaults to true; pass false when the example
   * draws its own footer or legend.
   */
  readonly footer?: boolean | undefined;
  /** Lays the children out in this many equal columns. */
  readonly columns?: number | undefined;
  /** The page layout frame.css gives this card, rendered as `data-variant`. */
  readonly variant?: FrameVariant | undefined;
  readonly children?: ReactNode;
}

function countLabel(count: number | string): string {
  if (typeof count === "string") return count;
  return `${count.toLocaleString("en-US")} ${count === 1 ? "row" : "rows"}`;
}

/** Leaves the server's HTML in place: the browser's first render must not hydrate the body. */
const keepServerHtml = { __html: "" };

/**
 * A card on the preview stage: a header with the title and count, the example, and a footer
 * whose `Footer.Legend` lists the keys that answer where focus is inside the frame.
 *
 * The frame owns one kernel and provides it to its children and its legend, so the legend
 * lists only this frame's keys, and two frames on one page never share a legend. An example
 * that needs its own `Keymap.Provider` (for custom keys) renders it inside the frame; the
 * nearest provider wins.
 *
 * The server renders the children with a kernel of its own, so the first paint has the final
 * size. The browser keeps that HTML, without hydrating it, until its own kernel exists, then
 * renders the children anew: key labels depend on the platform, which the server cannot know.
 * Rows, the count and the legend come from the browser's kernel.
 */
export function Frame({
  title,
  count,
  status,
  footer = true,
  columns,
  variant,
  children,
}: FrameProps): ReactElement {
  // Server only, and never disposed: effects do not run there, so nothing binds to it.
  const [serverKernel] = useState(() => (typeof document === "undefined" ? createKernel() : null));
  const [kernel, setKernel] = useState<Kernel | null>(null);
  const titleId = useId();
  useEffect(() => {
    const created = createKernel();
    setKernel(created);
    return () => created.dispose();
  }, []);
  const provide = (node: ReactNode) =>
    kernel === null ? null : <Densedash.Provider kernel={kernel}>{node}</Densedash.Provider>;
  const bodyKernel = kernel ?? serverKernel;
  const body = {
    "data-slot": "frame-body",
    "data-columns": columns === undefined ? undefined : "",
    style:
      columns === undefined ? undefined : ({ "--dd-docs-frame-columns": columns } as CSSProperties),
  };
  return (
    <div data-slot="frame" data-variant={variant} role="group" aria-labelledby={titleId}>
      <div data-slot="frame-header">
        <span data-slot="frame-title" id={titleId}>
          {title}
        </span>
        {count === undefined || kernel === null ? null : (
          <span data-slot="frame-count">{countLabel(count)}</span>
        )}
      </div>
      {bodyKernel === null ? (
        <div {...body} dangerouslySetInnerHTML={keepServerHtml} suppressHydrationWarning />
      ) : (
        <div {...body}>
          <Densedash.Provider kernel={bodyKernel}>{children}</Densedash.Provider>
        </div>
      )}
      {footer ? (
        <Footer.Root>
          {provide(<Footer.Legend />)}
          {status === undefined ? null : <Footer.Status role="status">{status}</Footer.Status>}
        </Footer.Root>
      ) : null}
    </div>
  );
}
