import previews from "virtual:densedash-previews";

export function ComponentPreview({ name }: { name: string }) {
  const preview = previews[name];
  if (!preview) throw new Error(`Unknown component preview: ${name}`);
  const { Component, html, fileName, source } = preview;

  return (
    <section data-slot="component-preview" aria-label={`${name} example`}>
      <div data-slot="preview-pane">
        <div data-slot="panel-heading">
          <span>Live preview</span>
          <span data-slot="live-label">Interactive</span>
        </div>
        <div data-slot="preview-stage">
          <Component />
        </div>
        <p data-slot="panel-note">Click to change state. Tab to navigate.</p>
      </div>
      <div data-slot="source-pane">
        <div data-slot="panel-heading">
          <span>{fileName}</span>
          <span>{source.split("\n").length - 1} lines · TSX</span>
        </div>
        <div
          data-slot="source-code"
          // HTML is produced by Shiki from trusted repository files at compile time.
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p data-slot="panel-note">
          Hover or focus an underlined symbol to inspect its inferred type.
        </p>
      </div>
    </section>
  );
}
