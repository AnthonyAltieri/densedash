// The registry wrappers' stylesheets, imported by path so they resolve to the same
// modules as the wrappers' `./styles/*.css` imports (see vite.config.ts). Example
// modules load lazily, but their CSS must be linked in the server-rendered head so
// previews paint styled before hydration. Order matches the wrappers' import order.
import "../../../../packages/css/src/components/kbd.css";
import "../../../../packages/css/src/components/tree.css";
import "../../../../packages/css/src/components/tabs.css";
import "../../../../packages/css/src/components/footer.css";
import "../../../../packages/css/src/components/app-shell.css";
import "../../../../packages/css/src/generated/tokens.css";
import "../../../../packages/css/src/components/keymap-scope.css";
import "../../../../packages/css/src/components/keymap-legend.css";
import "../../../../packages/css/src/components/keymap-chord-hint.css";
import "../../../../packages/css/src/components/keymap-confirm-prompt.css";
import "../../../../packages/css/src/components/table.css";
