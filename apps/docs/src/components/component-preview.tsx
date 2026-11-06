import { Suspense, use, useEffect, useId, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";
import "./example-styles.ts";
import { loadPreview } from "./previews.ts";

type Layout = "split" | "tabs";
type Tab = "preview" | "code";

const layouts: { value: Layout; label: string }[] = [
  { value: "split", label: "Side by side" },
  { value: "tabs", label: "Tabs" },
];
const tabs: { value: Tab; label: string }[] = [
  { value: "preview", label: "Preview" },
  { value: "code", label: "Code" },
];

interface ComponentPreviewProps {
  name: string;
  /** "tabs" gives the preview the full width, for examples such as the app shell. */
  defaultLayout?: Layout;
}

/**
 * Renders one example from its own module. The page's route loader must load it
 * with `loadPreviews` first; the boundary only holds the server HTML while the
 * module downloads during hydration.
 */
export function ComponentPreview(props: ComponentPreviewProps) {
  return (
    <Suspense fallback={null}>
      <LoadedPreview {...props} />
    </Suspense>
  );
}

function LoadedPreview({ name, defaultLayout = "split" }: ComponentPreviewProps) {
  const { Component, html, hovers, fileName, source } = use(loadPreview(name));
  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const [tab, setTab] = useState<Tab>("preview");
  const id = useId();
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const hover = useTypeHover();
  const isTabs = layout === "tabs";

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "preview" ? "code" : "preview";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      data-slot="component-preview"
      data-layout={layout}
      data-tab={tab}
      aria-label={`${name} example`}
    >
      <div data-slot="preview-toolbar">
        {isTabs ? (
          <div data-slot="preview-tabs" role="tablist" aria-label={`${name} example view`}>
            {tabs.map(({ value, label }) => (
              <button
                key={value}
                ref={(element) => {
                  tabRefs.current[value] = element;
                }}
                type="button"
                role="tab"
                id={`${id}-${value}-tab`}
                aria-selected={tab === value}
                aria-controls={`${id}-${value}`}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
                onKeyDown={onTabKeyDown}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span data-slot="toolbar-label">Preview and code</span>
        )}
        <div data-slot="layout-switch" role="group" aria-label="Example layout">
          {layouts.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={layout === value}
              onClick={() => setLayout(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        data-slot="preview-pane"
        id={`${id}-preview`}
        role={isTabs ? "tabpanel" : undefined}
        aria-labelledby={isTabs ? `${id}-preview-tab` : undefined}
      >
        <div data-slot="panel-heading">
          <span>Live preview</span>
          <span data-slot="live-label">Interactive</span>
        </div>
        <div data-slot="preview-stage">
          <Component />
        </div>
        <p data-slot="panel-note">Click to change state. Tab to navigate.</p>
      </div>
      <div
        data-slot="source-pane"
        id={`${id}-code`}
        role={isTabs ? "tabpanel" : undefined}
        aria-labelledby={isTabs ? `${id}-code-tab` : undefined}
      >
        <div data-slot="panel-heading">
          <span>{fileName}</span>
          <span>{source.split("\n").length - 1} lines · TSX</span>
        </div>
        <div
          data-slot="source-code"
          ref={hover.sourceRef}
          onPointerOver={hover.onPointerOver}
          onPointerOut={hover.onPointerOut}
          onFocus={hover.onFocus}
          onBlur={hover.onBlur}
          // HTML is produced by Shiki from trusted repository files at compile time.
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p data-slot="panel-note">
          Hover or focus an underlined symbol to inspect its inferred type.
        </p>
        {hovers.map((typeHover) => (
          <div
            key={typeHover.id}
            id={typeHover.id}
            data-slot="type-hover"
            popover="manual"
            onPointerLeave={hover.onHoverPointerLeave}
            // Shiki highlights twoslash type text from trusted repository files at compile time.
            dangerouslySetInnerHTML={{ __html: typeHover.html }}
          />
        ))}
      </div>
    </section>
  );
}

function tokenOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>("[data-dd-hover]") : null;
}

/**
 * Shows a token's type hover in the top layer, so the code panel's overflow
 * never clips it, and keeps it inside the viewport. The token and its hover
 * form one hover region: the pointer can move into the hover to scroll or
 * select it. Escape anywhere hides it.
 */
function useTypeHover() {
  const sourceRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const hoverId = token?.dataset["ddHover"];
    const hover = hoverId ? document.getElementById(hoverId) : null;
    if (!token || !hover) return;
    const place = () => {
      hover.style.setProperty("--dd-hover-x", "0px");
      hover.style.setProperty("--dd-hover-y", "0px");
      const margin = Number.parseFloat(
        getComputedStyle(hover).getPropertyValue("--dd-hover-margin"),
      );
      const anchor = token.getBoundingClientRect();
      const box = hover.getBoundingClientRect();
      const viewport = document.documentElement;
      const x = Math.max(margin, Math.min(anchor.left, viewport.clientWidth - box.width - margin));
      // Flush with the token, so the pointer crosses no gap on its way into the hover.
      const roomAbove = anchor.top - margin;
      const roomBelow = viewport.clientHeight - margin - anchor.bottom;
      const above = box.height <= roomAbove || (box.height > roomBelow && roomAbove > roomBelow);
      const y = above ? anchor.top - box.height : anchor.bottom;
      const maxY = viewport.clientHeight - box.height - margin;
      hover.style.setProperty("--dd-hover-x", `${x}px`);
      hover.style.setProperty("--dd-hover-y", `${Math.max(margin, Math.min(y, maxY))}px`);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setToken(null);
    };
    hover.showPopover();
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKeyDown);
      if (hover.matches(":popover-open")) hover.hidePopover();
    };
  }, [token]);

  /** The pointer left the token or its hover for `next`. */
  function leave(next: EventTarget | null) {
    if (next instanceof Element) {
      if (token?.contains(next) || next.closest('[data-slot="type-hover"]:popover-open')) return;
    }
    const focused = document.activeElement;
    setToken(sourceRef.current?.contains(focused) ? tokenOf(focused) : null);
  }

  return {
    sourceRef,
    onPointerOver(event: PointerEvent<HTMLElement>) {
      const next = tokenOf(event.target);
      if (next) setToken(next);
    },
    onPointerOut(event: PointerEvent<HTMLElement>) {
      const current = tokenOf(event.target);
      if (current && !current.contains(event.relatedTarget as Node | null)) {
        leave(event.relatedTarget);
      }
    },
    onHoverPointerLeave(event: PointerEvent<HTMLElement>) {
      leave(event.relatedTarget);
    },
    onFocus(event: FocusEvent<HTMLElement>) {
      const next = tokenOf(event.target);
      if (next) setToken(next);
    },
    onBlur() {
      setToken(null);
    },
  };
}
