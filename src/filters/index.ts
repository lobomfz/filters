export { isRelativeDate, resolveRelativeDate } from "./relative-dates.js";
export { deserializeFilter, serializeFilter } from "./url.js";
export {
  addRow,
  addRowWithField,
  buildResult,
  clearState,
  columnFor,
  conditionsFor,
  createInitialState,
  filterToRows,
  hasManualRows,
  removeRow,
  restoreRows,
  setRowCondition,
  setRowField,
  setRowValue,
} from "./filter-state.js";
export type { FilterRow, FilterState, FilterValue } from "./filter-state.js";

export type ColumnType = "string" | "number" | "boolean" | "date" | "enum";

export type FilterDescriptor<T = Record<string, unknown>> = {
  columns: {
    key: keyof T & string;
    type: ColumnType;
    conditions: { key: string; label: string }[];
    values?: string[];
  }[];
};
