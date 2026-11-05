import { Keymap } from "../ui/keymap.js";
import { Kbd, KbdRange } from "../ui/kbd.js";

export default function KbdExample() {
  return (
    <Keymap.Provider>
      <div data-slot="example-stack">
        <p>
          Command menu <Kbd hotkey="Mod+K" />
        </p>
        <p>
          Next list item <Kbd hotkey="Shift+J" />
        </p>
        <p>
          Go to ideas <Kbd hotkey={["G", "R"]} />
        </p>
        <p>
          Detail tabs <KbdRange from="1" to="3" />
        </p>
        <p>
          Custom label <Kbd>Esc</Kbd>
        </p>
      </div>
    </Keymap.Provider>
  );
}
