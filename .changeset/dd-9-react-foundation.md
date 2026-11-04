---
"@densedash/react": minor
"@densedash/css": minor
---

Add the React adapter foundation: `Densedash.Provider`, `useKernel`, `useStore`, `useRender`, `mergeProps` with `preventDensedashHandler`, `normalizeProps` and `useCommands`, plus the keymap parts `Keymap.Scope`, `Keymap.Legend`, `Keymap.ChordHint`, `Keymap.ConfirmPrompt` and `Kbd`. Ship their styles as `@densedash/css/components/<part>.css`, keyed on `data-slot` and state attributes. React 19 is a peer dependency.
