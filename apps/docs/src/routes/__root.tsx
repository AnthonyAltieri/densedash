import { useState } from "react";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { componentNames, components } from "../content/components.ts";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "densedash — More signal, less surface" },
      {
        name: "description",
        content:
          "Keyboard-first, information-dense interfaces. Explore typed components, live examples, keyboard presets and the shadcn registry.",
      },
    ],
    links: [
      { rel: "stylesheet", href: stylesheet },
      {
        rel: "icon",
        href: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2226%22 font-size=%2230%22>▥</text></svg>",
      },
    ],
  }),
  notFoundComponent: () => (
    <p>
      Page not found. <a href="/">Return to the overview.</a>
    </p>
  ),
  component: RootDocument,
});

function RootDocument() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  return (
    <html lang="en" data-theme={theme} data-dd-density={density}>
      <head>
        <HeadContent />
      </head>
      <body>
        <a data-slot="skip-link" href="#content">
          Skip to content
        </a>
        <header data-slot="site-header">
          <a data-slot="brand" href="/" aria-label="densedash home">
            <span data-slot="brand-mark" aria-hidden="true">
              ▥
            </span>
            densedash<span data-slot="brand-divider">/</span>
            <span data-slot="brand-caption">docs</span>
          </a>
          <div data-slot="preferences">
            <button
              type="button"
              aria-label="Toggle dark theme"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              Theme: {theme === "light" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              aria-label="Toggle comfortable density"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            >
              Density: {density === "compact" ? "Compact" : "Comfortable"}
            </button>
            <a href="https://github.com/densedash/densedash">GitHub ↗</a>
          </div>
        </header>
        <div data-slot="site-layout">
          <aside data-slot="sidebar">
            <nav aria-label="Documentation">
              <p data-slot="nav-label">Getting started</p>
              <Link to="/" activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }}>
                Overview
              </Link>
              <Link to="/changing-keys" activeProps={{ "aria-current": "page" }}>
                Changing keys
              </Link>
              <p data-slot="nav-label">Components</p>
              {componentNames.map((name) => (
                <Link
                  key={name}
                  to="/$component"
                  params={{ component: name }}
                  activeProps={{ "aria-current": "page" }}
                >
                  {components[name].title}
                </Link>
              ))}
            </nav>
            <div data-slot="sidebar-note">
              <span data-slot="status-dot" aria-hidden="true" />
              <span>
                v0 / Eight registry items
                <br />
                Built for keyboard work.
              </span>
            </div>
          </aside>
          <main id="content">
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
