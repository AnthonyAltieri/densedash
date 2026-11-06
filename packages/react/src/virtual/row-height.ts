/**
 * Pixels per row when the viewport has no `--dd-row-height` (the token stylesheet is not
 * loaded): 1.75rem, the compact density's row height, at the default 16px root font size. A
 * last resort only; with tokens loaded the estimate always comes from the token.
 */
const FALLBACK_ROW_HEIGHT = 28;

const UNIT = /^(-?\d*\.?\d+)(px|rem|em)$/;

/**
 * The computed `--dd-row-height` of `element` in pixels. Custom properties compute to their
 * specified text, so `px`, `rem` and `em` are converted here and anything else (such as a
 * `calc()`) is resolved by a hidden probe that takes the token as its block size.
 */
export function readRowHeight(element: HTMLElement): number {
  const view = element.ownerDocument.defaultView;
  if (view === null) return FALLBACK_ROW_HEIGHT;
  const value = view.getComputedStyle(element).getPropertyValue("--dd-row-height").trim();
  if (value === "") return FALLBACK_ROW_HEIGHT;
  const match = UNIT.exec(value);
  let pixels: number;
  if (match === null) {
    const probe = element.ownerDocument.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;block-size:var(--dd-row-height)";
    element.append(probe);
    pixels = probe.getBoundingClientRect().height;
    probe.remove();
  } else {
    const font =
      match[2] === "px"
        ? 1
        : Number.parseFloat(
            view.getComputedStyle(
              match[2] === "rem" ? element.ownerDocument.documentElement : element,
            ).fontSize,
          );
    pixels = Number(match[1]) * font;
  }
  return Number.isFinite(pixels) && pixels > 0 ? pixels : FALLBACK_ROW_HEIGHT;
}
