import { Cell } from "../docs/cell.js";
import { Frame } from "../docs/frame.js";
import { Kbd, KbdRange } from "../ui/kbd.js";

export default function KbdExample() {
  return (
    <Frame title="Key labels" count="6 forms" columns={3} footer={false}>
      <Cell.Specimen name="Single key" code='<Kbd hotkey="J" />'>
        <Kbd hotkey="J" />
      </Cell.Specimen>
      <Cell.Specimen name="With a modifier" code='<Kbd hotkey="Shift+J" />'>
        <Kbd hotkey="Shift+J" />
      </Cell.Specimen>
      <Cell.Specimen name="Platform modifier" code='<Kbd hotkey="Mod+K" />'>
        <Kbd hotkey="Mod+K" />
      </Cell.Specimen>
      <Cell.Specimen name="Sequence" code='<Kbd hotkey={["G", "R"]} />'>
        <Kbd hotkey={["G", "R"]} />
      </Cell.Specimen>
      <Cell.Specimen name="Range" code='<KbdRange from="1" to="3" />'>
        <KbdRange from="1" to="3" />
      </Cell.Specimen>
      <Cell.Specimen name="Custom label" code="<Kbd>Esc</Kbd>">
        <Kbd>Esc</Kbd>
      </Cell.Specimen>
    </Frame>
  );
}
