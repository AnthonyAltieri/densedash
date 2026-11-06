import { useContext, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ChangeDetails, KeyLayer } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { Scope } from "../keymap/scope.js";
import type { ScopeState } from "../keymap/scope.js";
import type { RenderProps, PartProps } from "../use-render.js";
import { ScopeContext } from "../scope-context.js";
import { useCommands } from "../use-commands.js";
import { TabsContext, changeDetails, numbered, tabId } from "./context.js";
import type { TabItem, TabsChangeReason, TabsContextValue } from "./context.js";

export interface TabsRootState {
  /** Focus is inside the tabs, so their number keys answer. */
  readonly active: boolean;
  /** The selected value, or empty when no tab is selected. */
  readonly value: string;
}

export interface TabsRootProps<Value extends string>
  extends ElementAttributes<HTMLDivElement>, PartProps<TabsRootState> {
  readonly children?: ReactNode | undefined;
  /** The tabs in order; the selectable values are inferred from their `value`s. */
  readonly items: readonly TabItem<Value>[];
  /** The selected tab, for a controlled group. */
  readonly value?: NoInfer<Value>;
  /** The tab selected first in an uncontrolled group. Defaults to the first enabled tab. */
  readonly defaultValue?: NoInfer<Value>;
  /** Names the tab list and the legend group of the number-key commands. */
  readonly label?: string | undefined;
  /** The command scope name. Defaults to a generated one. */
  readonly name?: string | undefined;
  /** Number-key commands answer throughout the page with these instance keys. */
  readonly keys?: KeyLayer | undefined;
  /** Runs before an uncontrolled change; `details.cancel()` keeps the current tab. */
  onValueChange?(value: NoInfer<Value>, details: ChangeDetails<TabsChangeReason>): void;
}

function NumberKeys({
  context,
  refocus,
  keys,
  children,
}: {
  context: TabsContextValue;
  refocus: { current: boolean };
  keys: KeyLayer | undefined;
  children: ReactNode;
}): ReactElement {
  const { id, items, label, value, select } = context;
  const element = useContext(ScopeContext)?.element ?? null;
  const commandScope = useCommands(
    items.slice(0, numbered).map((item, index) => ({
      id: `tabs.select.${index + 1}`,
      label: item.label,
      group: label ?? "Tabs",
      enabled: () => item.disabled !== true,
      run: ({ event }) => {
        const restore = element?.contains(element.ownerDocument.activeElement) ?? false;
        select(item.value, "keyboard", event);
        refocus.current &&= restore;
      },
    })),
    keys === undefined ? {} : { keys },
  );
  // A number key can unmount the focused panel content; keep focus in the group so it answers.
  useLayoutEffect(() => {
    if (!refocus.current || element === null) return;
    refocus.current = false;
    const document = element.ownerDocument;
    if (element.contains(document.activeElement)) return;
    const index = items.findIndex((item) => item.value === value);
    if (index >= 0) document.getElementById(tabId(id, index))?.focus();
  }, [refocus, element, items, value, id]);
  return <TabsContext value={{ ...context, commandScope }}>{children}</TabsContext>;
}

function firstEnabled(items: readonly TabItem[]): string | undefined {
  return items.find((item) => item.disabled !== true)?.value;
}

/**
 * Owns the selected tab and a command scope: while focus is inside, number keys select tabs
 * through `tabs.select.N` commands, so the focused group answers and presets choose the keys.
 */
export function Root<const Value extends string>({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  name,
  keys,
  render,
  ref,
  className,
  style,
  children,
  ...props
}: TabsRootProps<Value>): ReactElement {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState<string | undefined>(
    () => defaultValue ?? firstEnabled(items),
  );
  const selected: string | undefined = value ?? uncontrolled;
  const refocus = useRef(false);

  const select = (next: string, reason: TabsChangeReason, event: Event | undefined) => {
    const item = items.find((candidate) => candidate.value === next);
    if (item === undefined || item.disabled === true) return false;
    if (next === selected) return true;
    const details = changeDetails(reason, event);
    onValueChange?.(next as Value, details);
    if (details.canceled) return false;
    if (value === undefined) setUncontrolled(next);
    refocus.current = reason === "keyboard";
    return true;
  };

  const tabStop = items.some((item) => item.value === selected && item.disabled !== true)
    ? selected
    : firstEnabled(items);
  const context: TabsContextValue = { id, label, items, value: selected, tabStop, select };
  const state = (scope: ScopeState): TabsRootState => ({
    active: scope.active,
    value: selected ?? "",
  });

  return (
    <Scope
      name={name ?? `tabs${id}`}
      ref={ref}
      {...props}
      data-slot="tabs"
      data-value={selected}
      className={typeof className === "function" ? (scope) => className(state(scope)) : className}
      style={typeof style === "function" ? (scope) => style(state(scope)) : style}
      render={
        typeof render === "function"
          ? (rendered: RenderProps, scope: ScopeState) => render(rendered, state(scope))
          : render
      }
    >
      <NumberKeys context={context} refocus={refocus} keys={keys}>
        {children}
      </NumberKeys>
    </Scope>
  );
}
