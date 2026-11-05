import { createFileRoute } from "@tanstack/react-router";
import { componentNames, components } from "../content/components.ts";
import { ComponentPreview } from "../components/component-preview.tsx";

export const Route = createFileRoute("/")({ component: Overview });

function Overview() {
  return (
    <>
      <section id="overview" data-slot="intro">
        <div data-slot="eyebrow">
          <span>Documentation / Overview</span>
          <span>Components · v0</span>
        </div>
        <h1>
          More signal.
          <br />
          <span>Less surface.</span>
        </h1>
        <p data-slot="lede">
          Information-dense, keyboard-first building blocks for people who work with data. Start
          small. Keep the details within reach.
        </p>
        <div data-slot="intro-meta">
          <span>Plain CSS</span>
          <span>Typed by default</span>
          <span>Yours to compose</span>
        </div>
      </section>

      <section id="preview" data-slot="docs-section">
        <div data-slot="section-heading">
          <div>
            <p data-slot="eyebrow">01 / The workbench</p>
            <h2>See it. Read it. Make it yours.</h2>
          </div>
          <span data-slot="badge">Live source</span>
        </div>
        <p data-slot="section-description">
          Data-defined tree rows, shown beside the exact file that runs them. Focus the tree and
          navigate with j/k, expand with l, select with Space and open with Enter.
        </p>
        <ComponentPreview name="tree" />
      </section>

      <section id="registry" data-slot="docs-section">
        <div data-slot="section-heading">
          <div>
            <p data-slot="eyebrow">02 / Bring it into your project</p>
            <h2>Install from the registry.</h2>
          </div>
          <a data-slot="text-link" href="/r/tree.json">
            View JSON ↗
          </a>
        </div>
        <p data-slot="section-description">
          Add the namespace to components.json in a React / Tailwind v4 project initialized with
          shadcn. The registry copies typed wrappers and plain component CSS, installs
          @densedash/react, and includes the theme and keymap dependencies.
        </p>
        <pre data-slot="install-command">
          <code>
            {'{"registries":{"@densedash":"https://densedash-docs.vercel.app/r/{name}.json"}}'}
          </code>
        </pre>
        <pre data-slot="install-command">
          <code>pnpm dlx shadcn@4.23.0 add @densedash/tree</code>
        </pre>
        <p data-slot="footnote">
          Import the installed Keymap.Provider and wrap your parts once. It loads tokens and keymap
          styles and owns the browser kernel. Each component wrapper loads its copied CSS. Registry
          builds validate every item and embed the same wrappers these examples import.
        </p>
      </section>

      <section data-slot="docs-section">
        <h2>Eight items. One model.</h2>
        <div data-slot="registry-grid">
          {componentNames.map((name) => (
            <a key={name} href={`/${name}`}>
              <strong>{components[name].title}</strong>
              <span>@densedash/{name}</span>
            </a>
          ))}
        </div>
      </section>

      <footer data-slot="site-footer">
        <span>densedash / An open-source work in progress.</span>
        <span>Built for the details.</span>
      </footer>
    </>
  );
}
