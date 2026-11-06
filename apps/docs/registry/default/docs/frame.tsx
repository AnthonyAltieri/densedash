// Docs-only presentation helper that every example is drawn inside. Not part of the registry.
import { useEffect, useId, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createKernel } from "@densedash/core";
import type { Kernel } from "@densedash/core";
import { Densedash } from "@densedash/react";
import { Footer } from "../ui/footer.js";
import "./frame.css";

export interface FrameProps {
  /** The card's title, at the start of its header. */
  readonly title: string;
  /**
   * At the end of the header: a number reads as `N rows`, a string as written. It describes the
   * children, so it shows once they render.
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
  readonly children?: ReactNode;
}

function countLabel(count: number | string): string {
  if (typeof count === "string") return count;
  return `${count.toLocaleString("en-US")} ${count === 1 ? "row" : "rows"}`;
}

/**
 * A card on the preview stage: a header with the title and count, the example, and a footer
 * whose `Footer.Legend` lists the keys that answer where focus is inside the frame.
 *
 * The frame owns one kernel and provides it to its children and its legend, so the legend
 * lists only this frame's keys, and two frames on one page never share a legend. An example
 * that needs its own `Keymap.Provider` (for custom keys) renders it inside the frame; the
 * nearest provider wins. The children and the count render once the kernel exists, after
 * hydration; the card, title and footer render on the server.
 */
export function Frame({
  title,
  count,
  status,
  footer = true,
  columns,
  children,
}: FrameProps): ReactElement {
  const [kernel, setKernel] = useState<Kernel | null>(null);
  const titleId = useId();
  useEffect(() => {
    const created = createKernel();
    setKernel(created);
    return () => created.dispose();
  }, []);
  const provide = (node: ReactNode) =>
    kernel === null ? null : <Densedash.Provider kernel={kernel}>{node}</Densedash.Provider>;
  const layout =
    columns === undefined ? undefined : ({ "--dd-docs-frame-columns": columns } as CSSProperties);
  return (
    <div data-slot="frame" role="group" aria-labelledby={titleId}>
      <div data-slot="frame-header">
        <span data-slot="frame-title" id={titleId}>
          {title}
        </span>
        {count === undefined || kernel === null ? null : (
          <span data-slot="frame-count">{countLabel(count)}</span>
        )}
      </div>
      <div
        data-slot="frame-body"
        data-columns={columns === undefined ? undefined : ""}
        style={layout}
      >
        {provide(children)}
      </div>
      {footer ? (
        <Footer.Root>
          {provide(<Footer.Legend />)}
          {status === undefined ? null : <Footer.Status role="status">{status}</Footer.Status>}
        </Footer.Root>
      ) : null}
    </div>
  );
}
