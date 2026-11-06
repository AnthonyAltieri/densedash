import { createContext, useContext } from "react";
import type { TableHandleBase, TableView } from "./handle.js";

export interface TableContextValue {
  readonly table: TableHandleBase<unknown>;
  readonly view: TableView;
}

export const TableContext = createContext<TableContextValue | null>(null);

export function useTableContext(consumer: string): TableContextValue {
  const context = useContext(TableContext);
  if (context === null)
    throw new Error(`densedash: ${consumer} must be rendered inside <Table.Root>.`);
  return context;
}
