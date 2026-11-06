import fc from "fast-check";
import type { ModelNode } from "./navigation-model.js";

// Parents always precede children, so shrinking cannot create a cycle or a dangling parent.
export const nodesArbitrary = fc
  .array(fc.record({ parent: fc.integer({ min: -1, max: 11 }), disabled: fc.boolean() }), {
    maxLength: 12,
  })
  .map((entries): ModelNode[] =>
    entries.map((entry, index) => ({
      id: `n${index}`,
      parent: index === 0 || entry.parent < 0 ? null : `n${entry.parent % index}`,
      disabled: entry.disabled,
    })),
  );

export const propertyParameters = { seed: 680020, numRuns: 100 } as const;
