import { createFileRoute, notFound } from "@tanstack/react-router";
import reference from "virtual:densedash-reference";
import { ComponentPreview } from "../components/component-preview.tsx";
import { loadPreviews } from "../components/previews.ts";
import { components, isComponentName } from "../content/components.ts";

export const Route = createFileRoute("/$component")({
  beforeLoad: ({ params }) => {
    if (!isComponentName(params.component)) throw notFound();
    return { name: params.component };
  },
  loader: ({ context }) => {
    const component = components[context.name];
    const examples = "examples" in component ? component.examples : [];
    return loadPreviews([context.name, ...examples.map(({ name }) => name)]);
  },
  head: ({ match }) => ({ meta: [{ title: `${match.params.component} · densedash` }] }),
  component: ComponentPage,
});

function ComponentPage() {
  const { name } = Route.useRouteContext();
  const component = components[name];
  const shellKeys = "keys" in component ? component.keys : null;
  const examples = "examples" in component ? component.examples : [];
  const css = reference.css[name] ?? [];
  const keys = reference.keys.filter(({ command }) => {
    if (name === "keymap") return command === "confirm" || command === "cancel";
    if (name === "tabs") return command.startsWith("tabs.");
    if (name === "tree" || name === "list" || name === "table") {
      return command.startsWith("tree.") || (name === "table" && command.startsWith("table."));
    }
    return false;
  });
  return (
    <>
      <section data-slot="intro">
        <p data-slot="eyebrow">
          Documentation / {name === "theme" ? "Customization" : "Components"}
        </p>
        <h1>{component.title}</h1>
        <p data-slot="lede">{component.description}</p>
      </section>
      <section data-slot="docs-section">
        <h2>Install</h2>
        <p data-slot="section-description">
          Configure the namespace on the overview, then add the item. CSS and dependencies install
          together.
        </p>
        <pre data-slot="install-command">
          <code>pnpm dlx shadcn@4.23.0 add @densedash/{name}</code>
        </pre>
        <p data-slot="footnote">
          <a data-slot="text-link" href={`/r/${name}.json`}>
            Inspect registry JSON ↗
          </a>
        </p>
      </section>
      <section data-slot="docs-section">
        <h2>Live example</h2>
        <p data-slot="section-description">
          {name === "keymap" ? (
            <>
              Click the number or tab to it, then press n or p. The provider's preset binds the two
              commands from useCommands, and the legend lists their keys while the counter has
              focus; typing in a field elsewhere leaves the size alone. For key layers that answer
              anywhere on the page, see the{" "}
              <a data-slot="text-link" href="/app-shell">
                app shell
              </a>
              ; to rebind keys, see{" "}
              <a data-slot="text-link" href="/changing-keys">
                Changing keys
              </a>
              . A preset key can also be a sequence and a command can ask for confirmation;
              Keymap.ChordHint and Keymap.ConfirmPrompt show them.
            </>
          ) : name === "theme" ? (
            "Both lists use the same parts and stylesheet. Only the second wrapper sets variables; compare with the theme and density controls above."
          ) : name === "app-shell" ? (
            "The sidebar, list and detail tabs each have a key layer that answers anywhere on this page, whatever has focus. The footer lists the keys and reports the last one pressed and what it did, including keys that change nothing. Switch to Code to read the file that runs it."
          ) : (
            "Focus the example to activate its keys. Hover the code to see inferred types. This imports the exact wrappers installed by the registry."
          )}
        </p>
        <ComponentPreview
          name={name}
          defaultLayout={name === "app-shell" || name === "table" ? "tabs" : "split"}
        />
        <p data-slot="footnote">
          Frame and Cell are docs-only presentation helpers, not part of the registry; read{" "}
          <a
            data-slot="text-link"
            href="https://github.com/densedash/densedash/tree/main/apps/docs/registry/default/docs"
          >
            their source on GitHub ↗
          </a>
        </p>
      </section>
      {examples.map((example) => (
        <section key={example.name} data-slot="docs-section">
          <h2>{example.title}</h2>
          <p data-slot="section-description">{example.description}</p>
          <ComponentPreview name={example.name} />
        </section>
      ))}
      <section data-slot="docs-section">
        <h2>Types and composition</h2>
        <p data-slot="section-description">{component.types}</p>
        {(name === "tree" || name === "list" || name === "table") && (
          <p data-slot="section-description">
            For large collections, pass virtual to Viewport and give it a bounded height: it mounts
            only the rows in view with TanStack Virtual, estimates them at --dd-row-height (so the
            estimate follows the density setting) and measures them as they render. Tune it with
            virtual={"{{ overscan, estimateSize, measure }}"}, or pass your own strategy to
            virtualizer. The default renders all data rows.
          </p>
        )}
      </section>
      <section data-slot="docs-section">
        <h2>Parts</h2>
        <p data-slot="section-description">
          Default elements can be replaced with render. Boolean data attributes are present only
          when true. Slot names are data-slot values.
        </p>
        <div data-slot="reference-scroll">
          <table data-slot="reference-table" aria-label="Parts">
            <thead>
              <tr>
                <th>Part</th>
                <th>Element · slot</th>
                <th>Attributes / behavior</th>
              </tr>
            </thead>
            <tbody>
              {component.parts.map(([part, element, attributes]) => (
                <tr key={part}>
                  <th>{part}</th>
                  <td>{element}</td>
                  <td>{attributes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section data-slot="docs-section">
        <h2>CSS variables</h2>
        <p data-slot="section-description">
          Generated from @densedash/css tokens.json
          {name === "theme"
            ? "; the complete token catalog."
            : ", filtered by var(--dd-*) references in this component's CSS and included key labels."}{" "}
          Values retain their source references; size tokens show compact → comfortable.
        </p>
        <div data-slot="reference-scroll">
          <table data-slot="reference-table" aria-label="CSS variables">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Light / default / compact</th>
                <th>Dark / comfortable</th>
              </tr>
            </thead>
            <tbody>
              {css.map((token) => (
                <tr key={token.name}>
                  <th>
                    <code>{token.name}</code>
                  </th>
                  <td>
                    <code>{token.light ?? token.compact ?? token.value}</code>
                  </td>
                  <td>
                    <code>{token.dark ?? token.comfortable ?? "Same"}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section data-slot="docs-section">
        <h2>Keyboard</h2>
        <p data-slot="section-description">
          {shellKeys !== null
            ? "The sidebar uses treePreset (j/k/l/h and u for parent); the list uses shiftedTreePreset (Shift+J/K/L/H and Shift+U for parent). Detail tabs use the kernel's tabs.select keys. Parent does nothing at the top level. Each layer answers throughout the page; typing in a text field keeps its letters. Parent is a secondary hint, available with all; this example filters secondary hints to keep its custom footer in one row. Swap a preset to rebind; the pane headers and the footer legend follow."
            : name === "keymap"
              ? "The example's own preset binds increase to N and decrease to P. Every preset also keeps the confirm and cancel keys from tradingPreset, listed below; they answer while a confirmation prompt is pending."
              : keys.length === 0
                ? "This item registers no commands. Kbd formats labels, Footer reads the live keymap, and the theme sets variables."
                : "Generated from tradingPreset, formatted by the kernel's keyboard port at build time. Keys act within the focused scope. An empty key list leaves the command available programmatically. Change keys with one preset or per-command overrides."}
        </p>
        {shellKeys !== null && (
          <div data-slot="reference-scroll">
            <table data-slot="reference-table" aria-label="Keyboard">
              <thead>
                <tr>
                  <th>Keys</th>
                  <th>Pane</th>
                  <th>Command</th>
                  <th>Behavior</th>
                </tr>
              </thead>
              <tbody>
                {shellKeys.map(([hotkeys, pane, command, behavior]) => (
                  <tr key={hotkeys}>
                    <th>{hotkeys}</th>
                    <td>{pane}</td>
                    <td>
                      <code>{command}</code>
                    </td>
                    <td>{behavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {keys.length > 0 && (
          <div data-slot="reference-scroll">
            <table data-slot="reference-table" aria-label="Keyboard">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Default keys</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(({ command, keys: bindings }) => (
                  <tr key={command}>
                    <th>
                      <code>{command}</code>
                    </th>
                    <td>{bindings.join(" · ") || "Unbound"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
