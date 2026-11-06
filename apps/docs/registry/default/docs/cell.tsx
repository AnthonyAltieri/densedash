// Docs-only presentation helpers for the cells of example rows. Not part of the registry.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./cell.css";

const MINUS = "−";

function number(value: number, digits: number): string {
  return Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** `−` below zero, else nothing. */
function minus(value: number): string {
  return value < 0 ? MINUS : "";
}

/** `−` below zero, else `+`. */
function sign(value: number): string {
  return value < 0 ? MINUS : "+";
}

function tone(value: number): "positive" | "negative" {
  return value < 0 ? "negative" : "positive";
}

/** A custom property for the stylesheet, such as a bar's share of its track. */
function share(name: string, percent: number): CSSProperties {
  return { [name]: `${percent}%` } as CSSProperties;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

interface TextProps {
  readonly children?: ReactNode;
}

interface ValueProps {
  /** Empty when absent, so the column keeps its width. */
  readonly value?: number | undefined;
}

/** A ticker in monospace, such as `AAPL`. */
function Code({ children }: TextProps): ReactElement {
  return <span data-slot="cell-code">{children}</span>;
}

/** A row's name. After a `Code` it reads as the instrument's full name, muted and truncated. */
function Name({ children }: TextProps): ReactElement {
  return <span data-slot="cell-name">{children}</span>;
}

/** Muted secondary text that takes the row's free space and truncates. */
function Note({ children }: TextProps): ReactElement {
  return <span data-slot="cell-note">{children}</span>;
}

/** A price as a tabular number with fixed decimals, pushed to the row's end. */
function Price({
  value,
  digits = 2,
}: ValueProps & { readonly digits?: number | undefined }): ReactElement {
  return (
    <span data-slot="cell-price">
      {value === undefined ? null : `${minus(value)}${number(value, digits)}`}
    </span>
  );
}

/** A signed percent change, green or red: `+1.24%`, `−0.7%`. */
function Change({ value }: ValueProps): ReactElement {
  return (
    <span data-slot="cell-change" data-tone={value === undefined ? undefined : tone(value)}>
      {value === undefined
        ? null
        : `${sign(value)}${Math.abs(value).toLocaleString("en-US", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
          })}%`}
    </span>
  );
}

/** A count on a pill, pushed to the row's end. */
function Count({ value }: { readonly value: number }): ReactElement {
  return <span data-slot="cell-count">{number(value, 0)}</span>;
}

/** A group's count of what it holds and its unit, such as `5 open`, in the price column. */
function Total({ value, unit }: { readonly value: number; readonly unit: string }): ReactElement {
  return <span data-slot="cell-total">{`${number(value, 0)} ${unit}`}</span>;
}

/** A tag's colour: `Live` is positive, `Paper` the accent, anything else neutral. */
export type TagTone = "positive" | "accent" | "neutral";

const tagTones: Readonly<Record<string, TagTone>> = { Live: "positive", Paper: "accent" };

/** A small tinted label, such as an idea's stage. */
function Tag({
  value,
  tone: toneOverride,
}: {
  readonly value?: string | undefined;
  readonly tone?: TagTone | undefined;
}): ReactElement | null {
  if (value === undefined) return null;
  return (
    <span data-slot="cell-tag" data-tone={toneOverride ?? tagTones[value] ?? "neutral"}>
      {value}
    </span>
  );
}

/** A signed percent change on a tinted pill, with two decimals: `+0.85%`. */
function Chip({ value }: { readonly value: number }): ReactElement {
  return (
    <span data-slot="cell-chip" data-tone={tone(value)}>
      {`${sign(value)}${number(value, 2)}%`}
    </span>
  );
}

/**
 * A horizontal bar and its number, one decimal. The bar grows with the square root of
 * `value / max`, so small values stay visible beside large ones.
 */
function Bar({ value, max }: { readonly value: number; readonly max: number }): ReactElement {
  const width = clamp(Math.round(Math.sqrt(Math.max(0, value) / max) * 100), 2, 100);
  return (
    <span data-slot="cell-bar">
      <span data-slot="cell-bar-track" aria-hidden="true">
        <span data-slot="cell-bar-fill" style={share("--dd-docs-bar-share", width)} />
      </span>
      <span data-slot="cell-bar-value">{`${minus(value)}${number(value, 1)}`}</span>
    </span>
  );
}

/**
 * A bar growing right from a centre line for positive values and left for negative ones,
 * scaled to `max` each way, and its whole number.
 */
function Diverging({ value, max }: { readonly value: number; readonly max: number }): ReactElement {
  const width = clamp(Math.round((Math.abs(value) / max) * 100), 0, 100);
  return (
    <span data-slot="cell-diverging" data-tone={value < 0 ? "short" : "long"}>
      <span data-slot="cell-diverging-track" aria-hidden="true">
        <span data-slot="cell-diverging-half" data-side="short">
          {value < 0 && (
            <span data-slot="cell-diverging-fill" style={share("--dd-docs-bar-share", width)} />
          )}
        </span>
        <span data-slot="cell-diverging-half" data-side="long">
          {value > 0 && (
            <span data-slot="cell-diverging-fill" style={share("--dd-docs-bar-share", width)} />
          )}
        </span>
      </span>
      <span data-slot="cell-diverging-value">{`${minus(value)}${number(value, 0)}`}</span>
    </span>
  );
}

/** A large, centred sample with its name under it and, optionally, the code that makes it. */
function Specimen({
  name,
  code,
  children,
}: {
  readonly name: string;
  readonly code?: string | undefined;
  readonly children?: ReactNode;
}): ReactElement {
  return (
    <figure data-slot="cell-specimen">
      <span data-slot="cell-specimen-sample">{children}</span>
      <figcaption data-slot="cell-specimen-name">{name}</figcaption>
      {code === undefined ? null : <code data-slot="cell-specimen-code">{code}</code>}
    </figure>
  );
}

/** Cells for example rows: each a span with a `data-slot` that the docs stylesheet sizes. */
export const Cell = {
  Code,
  Name,
  Note,
  Price,
  Change,
  Count,
  Total,
  Tag,
  Chip,
  Bar,
  Diverging,
  Specimen,
};
