import { Keymap } from "../ui/keymap.js";
import { Kbd } from "../ui/kbd.js";

export default function KbdExample() {
  return (
    <Keymap.Provider>
      <div data-slot="example-stack">
        <p>
          Command menu <Kbd hotkey="Mod+K" />
        </p>
        <p>
          Go home <Kbd hotkey={["G", "H"]} />
        </p>
        <p>
          Custom label <Kbd>Esc</Kbd>
        </p>
      </div>
    </Keymap.Provider>
  );
}
