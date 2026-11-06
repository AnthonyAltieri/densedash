import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import * as Footers from "../footer.js";
import type { LegendProps } from "../footer.js";
import { Kbd } from "../kbd.js";
import { Scope } from "../keymap/scope.js";
import type { ScopeState } from "../keymap/scope.js";
import { useKernelFor } from "../context.js";
import { getInternals } from "../tree/handle.js";
import type { TreeHandleBase } from "../tree/handle.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useStore } from "../use-store.js";

export interface RootProps extends ElementAttributes<HTMLDivElement>, PartProps<ScopeState> {
  readonly children?: ReactNode | undefined;
  /** The shell's command scope name. Defaults to `app-shell`. */
  readonly name?: string | undefined;
  /**
   * The shell is the page's scope by default: focus that falls back to `<body>` returns to it.
   * Pass `false` when the app renders its own page scope around the shell.
   */
  readonly page?: boolean | undefined;
}

/**
 * The shell: `<AppShell.Panes>` above an `<AppShell.Footer>`, in a `<Keymap.Scope>`. The panes'
 * key layers answer throughout the page; the shell itself registers no commands.
 */
export function Root({ name = "app-shell", page = true, ...props }: RootProps): ReactElement {
  return <Scope name={name} page={page} {...props} data-slot="app-shell" />;
}

export interface PanesState {}

export interface PanesProps extends ElementAttributes<HTMLDivElement>, PartProps<PanesState> {
  readonly children?: ReactNode | undefined;
}

/** The row of panes, which wrap onto new rows at narrow widths. */
export function Panes({ render, ref, className, style, ...props }: PanesProps): ReactElement {
  const state: PanesState = {};
  return useRender({
    render,
    ref,
    state,
    props: { ...mergeProps({ "data-slot": "app-shell-panes" }, props), className, style },
  });
}

export interface FooterState {}

export interface FooterProps
  extends
    ElementAttributes<HTMLElement>,
    PartProps<FooterState>,
    Pick<LegendProps, "filter" | "groupBy" | "order" | "all" | "labels"> {
  /** The status slot at the end of the row, such as the last key and what it did. */
  readonly children?: ReactNode | undefined;
}

/** `<Footer.Root>` with the live key legend and, when given children, a status slot. */
export function Footer({
  filter,
  groupBy,
  order,
  all,
  labels,
  children,
  ...props
}: FooterProps): ReactElement {
  return (
    <Footers.Root {...props}>
      <Footers.Legend filter={filter} groupBy={groupBy} order={order} all={all} labels={labels} />
      {children === undefined ? null : <Footers.Status>{children}</Footers.Status>}
    </Footers.Root>
  );
}

export interface TextState {}

export interface TextProps extends ElementAttributes<HTMLSpanElement>, PartProps<TextState> {
  readonly children?: ReactNode | undefined;
}

/** A row's label: it takes the free space and ends in an ellipsis when it does not fit. */
export function Label({ render, ref, className, style, ...props }: TextProps): ReactElement {
  const state: TextState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "span",
    props: { ...mergeProps<"span">({ "data-slot": "app-shell-label" }, props), className, style },
  });
}

/** A row's count, in the muted monospace style, at the end of the row. */
export function Count({ render, ref, className, style, ...props }: TextProps): ReactElement {
  const state: TextState = {};
  return useRender({
    render,
    ref,
    state,
    defaultTagName: "span",
    props: { ...mergeProps<"span">({ "data-slot": "app-shell-count" }, props), className, style },
  });
}

/**
 * The first key of each command in the tree's key layer, read from the keymap, so a pane header
 * shows whatever the preset or an override binds. Shows nothing for a tree without `keys`.
 */
export function LayerKeys({
  tree,
  commands,
}: {
  tree: TreeHandleBase<unknown>;
  commands: readonly string[];
}): ReactElement | null {
  const kernel = useKernelFor("<AppShell>");
  const layer = getInternals(tree).options().keys?.label;
  // Joined into one string so the header re-renders only when its keys change.
  const keys = useStore(kernel.commands.keymap, (entries) =>
    layer === undefined
      ? ""
      : commands
          .map(
            (command) =>
              entries.find((entry) => entry.layer === layer && entry.command === command)
                ?.keys[0] ?? "",
          )
          .join("\n"),
  );
  const labels = keys.split("\n").filter((key) => key !== "");
  if (labels.length === 0) return null;
  return (
    <span data-slot="app-shell-keys">
      {labels.map((key, index) => (
        <Kbd key={`${index}\u0000${key}`}>{key}</Kbd>
      ))}
    </span>
  );
}
