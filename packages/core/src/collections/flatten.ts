import type { Key, TreeRow, TreeSource } from "./types.js";

interface Frame<T> {
  items: readonly T[];
  offset: number;
  parentKey: Key | null;
  visible: boolean;
}

/**
 * Visible preorder rows. Index/depth are zero-based; sibling positions are one-based.
 * Validate the entire source, including collapsed branches, in O(total items).
 * Duplicate keys and ancestor cycles throw in every environment, naming the key.
 */
export function flatten<T>(source: TreeSource<T>, expanded: ReadonlySet<Key>): TreeRow<T>[] {
  const rows: TreeRow<T>[] = [];
  const seen = new Set<Key>();
  const ancestors = new Set<Key>();
  const stack: Frame<T>[] = [{ items: source.roots, offset: 0, parentKey: null, visible: true }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.offset === frame.items.length) {
      if (frame.parentKey !== null) ancestors.delete(frame.parentKey);
      stack.pop();
      continue;
    }

    const item = frame.items[frame.offset++]!;
    const key = source.getKey(item);
    if (ancestors.has(key)) throw new Error(`Collection cycle at key "${key}".`);
    if (seen.has(key)) throw new Error(`Duplicate collection key "${key}".`);
    seen.add(key);

    const children = source.getChildren?.(item);
    const hasChildren = children !== undefined && children.length > 0;
    const isExpanded = hasChildren && expanded.has(key);
    if (frame.visible) {
      rows.push({
        key,
        item,
        index: rows.length,
        depth: stack.length - 1,
        parentKey: frame.parentKey,
        hasChildren,
        expanded: isExpanded,
        posInSet: frame.offset,
        setSize: frame.items.length,
        disabled: source.isDisabled?.(item) ?? false,
        textValue: source.getTextValue?.(item) ?? key,
      });
    }

    if (children !== undefined && hasChildren) {
      ancestors.add(key);
      stack.push({
        items: children,
        offset: 0,
        parentKey: key,
        visible: frame.visible && isExpanded,
      });
    }
  }

  return rows;
}
