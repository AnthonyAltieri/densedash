import { createFileRoute } from "@tanstack/react-router";
import { ComponentPreview } from "../components/component-preview.tsx";

export const Route = createFileRoute("/")({ component: Overview });

function Overview() {
  return (
    <>
      <section id="overview" data-slot="intro">
        <div data-slot="eyebrow">
          <span>Documentation / Overview</span>
          <span>Scaffold · 0.0.0</span>
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
          One interactive placeholder, shown beside the exact file that runs it. The component
          library is coming next.
        </p>
        <ComponentPreview name="placeholder" />
      </section>

      <section id="registry" data-slot="docs-section">
        <div data-slot="section-heading">
          <div>
            <p data-slot="eyebrow">02 / Bring it into your project</p>
            <h2>Install from the registry.</h2>
          </div>
          <a data-slot="text-link" href="/r/placeholder.json">
            View JSON ↗
          </a>
        </div>
        <p data-slot="section-description">
          With the docs server running, add the placeholder to a React project initialized with
          shadcn. The local docs server uses port 3000 by default.
        </p>
        <pre data-slot="install-command">
          <code>pnpm dlx shadcn@4.23.0 add http://localhost:3000/r/placeholder.json</code>
        </pre>
        <p data-slot="footnote">
          Registry items are validated with Effect before they are served. This placeholder
          demonstrates installation; it does not yet ship component styles or a public API.
        </p>
      </section>

      <footer data-slot="site-footer">
        <span>densedash / An open-source work in progress.</span>
        <span>Built for the details.</span>
      </footer>
    </>
  );
}
