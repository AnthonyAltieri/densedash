// Independent specification: no production imports or engine helpers.
export interface ModelNode {
  id: string;
  parent: string | null;
  disabled: boolean;
}

export type ModelAction =
  | "next"
  | "prev"
  | "first"
  | "last"
  | "pageUp"
  | "pageDown"
  | "parent"
  | "expand"
  | "collapse";

export class NavigationModel {
  readonly expanded = new Set<string>();
  cursor: string | null = null;

  constructor(
    readonly nodes: readonly ModelNode[],
    readonly loop: boolean,
    readonly pageSize: number,
  ) {}

  visible(): ModelNode[] {
    const result: ModelNode[] = [];
    const visit = (parent: string | null) => {
      for (const node of this.nodes.filter((node) => node.parent === parent)) {
        result.push(node);
        if (this.expanded.has(node.id)) visit(node.id);
      }
    };
    visit(null);
    return result;
  }

  apply(action: ModelAction): void {
    const enabled = this.visible().filter((node) => !node.disabled);
    const current = this.nodes.find((node) => node.id === this.cursor);
    if (action === "expand" || action === "collapse") {
      if (!current || current.disabled || !this.nodes.some((node) => node.parent === current.id))
        return;
      if (action === "expand") this.expanded.add(current.id);
      else this.expanded.delete(current.id);
      return;
    }
    if (action === "parent") {
      let ancestor = current?.parent;
      while (ancestor != null) {
        const node = this.nodes.find((node) => node.id === ancestor)!;
        if (!node.disabled) {
          this.cursor = node.id;
          break;
        }
        ancestor = node.parent;
      }
      return;
    }
    if (!enabled.length) {
      this.cursor = null;
      return;
    }
    if (action === "first" || action === "last") {
      this.cursor = (action === "first" ? enabled[0]! : enabled.at(-1)!).id;
      return;
    }
    const direction = action === "next" || action === "pageDown" ? 1 : -1;
    let index =
      this.cursor === null
        ? direction === 1
          ? -1
          : enabled.length
        : enabled.findIndex((node) => node.id === this.cursor);
    const count = action === "pageUp" || action === "pageDown" ? this.pageSize : 1;
    for (let step = 0; step < count; step++) {
      index += direction;
      if (this.loop) index = (index + enabled.length) % enabled.length;
      else index = Math.max(0, Math.min(enabled.length - 1, index));
    }
    this.cursor = enabled[index]!.id;
  }
}
