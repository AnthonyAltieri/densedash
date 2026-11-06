import { createFileRoute } from "@tanstack/react-router";
import { ComponentPreview } from "../components/component-preview.tsx";
import { loadPreviews } from "../components/previews.ts";

export const Route = createFileRoute("/changing-keys")({
  head: () => ({ meta: [{ title: "Changing keys · densedash" }] }),
  loader: () => loadPreviews(["preset", "override"]),
  component: ChangingKeys,
});

function ChangingKeys() {
  return (
    <>
      <section data-slot="intro">
        <p data-slot="eyebrow">Documentation / Customization</p>
        <h1>Changing keys</h1>
        <p data-slot="lede">
          Commands describe actions. A swappable preset chooses their keys. Components contain no
          fixed bindings.
        </p>
      </section>
      <section data-slot="docs-section">
        <h2>Replace the preset</h2>
        <p data-slot="section-description">
          Focus the counter, then press n or p. The replacement object binds only next and previous;
          j, k and the arrows no longer change the count. The command layer still supplies
          confirm/cancel defaults when a replacement omits them.
        </p>
        <ComponentPreview name="preset" />
      </section>
      <section data-slot="docs-section">
        <h2>Override one command</h2>
        <p data-slot="section-description">
          Focus this example and press o to open. Enter no longer opens: an override replaces the
          command's entire key list, while other commands retain their preset keys. Use an empty
          array to unbind a command.
        </p>
        <ComponentPreview name="override" />
      </section>
      <section data-slot="docs-section">
        <h2>Application ownership</h2>
        <p data-slot="section-description">
          Keep keys stable at module scope or memoize them. The registry Provider creates and
          disposes its kernel. With an application-owned kernel, pass keys to createKernel and
          expose it through Densedash.Provider; the app disposes the kernel. For saved preferences,
          use commands.setOverrides(next) and keys.onChange. Overrides are validated by the keyboard
          port; an invalid override warns and retains the preset binding.
        </p>
      </section>
    </>
  );
}
