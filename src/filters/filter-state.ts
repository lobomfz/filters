import type { FilterFor } from "../types.js";
import type { RelativeDate } from "../types.js";
import type { FilterDescriptor } from "./index.js";
import { isRelativeDate } from "./relative-dates.js";

export type FilterValue =
  | string
  | string[]
  | number
  | boolean
  | Date
  | RelativeDate
  | [FilterValue | undefined, FilterValue | undefined]
  | undefined;

export type FilterRow = {
  id: number;
  field?: string;
  condition?: string;
  value?: FilterValue;
};

export type FilterState = {
  rows: FilterRow[];
  manualRowIds: Set<number>;
};

type ScalarCondition = "equals" | "not_equals" | "gt" | "gte" | "lt" | "lte";
type ArrayCondition = "is_in" | "is_not_in";
type RangeCondition = "between";

type CompleteFilterRow =
  | {
      id: number;
      field: string;
      condition: RangeCondition;
      value: [FilterValue, FilterValue];
    }
  | {
      id: number;
      field: string;
      condition: ArrayCondition;
      value: string[];
    }
  | {
      id: number;
      field: string;
      condition: ScalarCondition;
      value: FilterValue;
    };

const conditionToOperator: Record<string, string | null> = {
  equals: null,
  not_equals: "not",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  between: null,
  is_in: null,
  is_not_in: "notIn",
};

let nextRowId = 0;

const operatorToCondition: Record<string, string> = {
  not: "not_equals",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  notIn: "is_not_in",
};

function createRow(
  field: string,
  condition: string,
  value: FilterValue,
): FilterRow {
  return {
    id: ++nextRowId,
    field,
    condition,
    value,
  };
}

function toSingleRowValue(
  column: FilterDescriptor["columns"][number],
  value: unknown,
): FilterValue {
  if (column.type !== "date" || typeof value !== "string") {
    return value as FilterValue;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date;
}

function toRowValue(
  column: FilterDescriptor["columns"][number],
  value: unknown,
): FilterValue {
  if (Array.isArray(value)) {
    return value.map((item) => toSingleRowValue(column, item)) as FilterValue;
  }

  return toSingleRowValue(column, value);
}

export function createInitialState(): FilterState {
  return { rows: [], manualRowIds: new Set() };
}

export function addRow(state: FilterState): FilterState {
  const id = ++nextRowId;

  return {
    rows: [...state.rows, { id }],
    manualRowIds: new Set([...state.manualRowIds, id]),
  };
}

export function addRowWithField(
  state: FilterState,
  field: string,
): FilterState {
  const id = ++nextRowId;

  return {
    rows: [...state.rows, { id, field }],
    manualRowIds: new Set([...state.manualRowIds, id]),
  };
}

export function removeRow(state: FilterState, index: number): FilterState {
  const removed = state.rows[index];
  const manualRowIds = new Set(state.manualRowIds);

  if (removed) {
    manualRowIds.delete(removed.id);
  }

  return {
    rows: state.rows.filter((_, i) => i !== index),
    manualRowIds,
  };
}

export function setRowField(
  state: FilterState,
  index: number,
  field: string,
): FilterState {
  return {
    rows: state.rows.map((row, i) =>
      i === index ? { id: row.id, field } : row,
    ),
    manualRowIds: state.manualRowIds,
  };
}

export function setRowCondition(
  state: FilterState,
  index: number,
  condition: string,
): FilterState {
  return {
    rows: state.rows.map((row, i) =>
      i === index ? { ...row, condition, value: undefined } : row,
    ),
    manualRowIds: state.manualRowIds,
  };
}

export function setRowValue(
  state: FilterState,
  index: number,
  value: FilterValue,
): FilterState {
  return {
    rows: state.rows.map((row, i) => (i === index ? { ...row, value } : row)),
    manualRowIds: state.manualRowIds,
  };
}

export function restoreRows(rows: Omit<FilterRow, "id">[]): FilterState {
  return {
    rows: rows.map((row) => ({ ...row, id: ++nextRowId })),
    manualRowIds: new Set(),
  };
}

export function clearState(): FilterState {
  return { rows: [], manualRowIds: new Set() };
}

export function hasManualRows(state: FilterState): boolean {
  return state.rows.some(
    (r) =>
      state.manualRowIds.has(r.id) &&
      r.field != null &&
      r.condition != null &&
      r.value != null,
  );
}

export function filterToRows<T>(
  descriptor: FilterDescriptor<T>,
  filter: Record<string, unknown>,
): FilterRow[] {
  const rows: FilterRow[] = [];

  for (const [field, filterValue] of Object.entries(filter)) {
    const column = descriptor.columns.find((item) => item.key === field);

    if (!column || filterValue == null) {
      continue;
    }

    if (Array.isArray(filterValue)) {
      rows.push(createRow(field, "is_in", toRowValue(column, filterValue)));
      continue;
    }

    if (
      typeof filterValue !== "object" ||
      filterValue instanceof Date ||
      isRelativeDate(filterValue)
    ) {
      rows.push(createRow(field, "equals", toRowValue(column, filterValue)));
      continue;
    }

    const operators = filterValue as Record<string, unknown>;
    const hasBetween = "gte" in operators && "lte" in operators;

    if (hasBetween) {
      rows.push(
        createRow(field, "between", [
          toRowValue(column, operators.gte),
          toRowValue(column, operators.lte),
        ]),
      );
    }

    for (const [operator, value] of Object.entries(operators)) {
      if (value == null) {
        continue;
      }

      if (hasBetween && (operator === "gte" || operator === "lte")) {
        continue;
      }

      const condition = operatorToCondition[operator];

      if (!condition) {
        continue;
      }

      rows.push(createRow(field, condition, toRowValue(column, value)));
    }
  }

  return rows;
}

export function conditionsFor<T>(
  descriptor: FilterDescriptor<T>,
  field: string,
): FilterDescriptor<T>["columns"][number]["conditions"] {
  const column = descriptor.columns.find((c) => c.key === field);

  return column?.conditions ?? [];
}

export function columnFor<T>(
  descriptor: FilterDescriptor<T>,
  field: string,
): FilterDescriptor<T>["columns"][number] {
  const column = descriptor.columns.find((c) => c.key === field);

  if (!column) {
    throw new Error(`Column not found: ${field}`);
  }

  return column;
}

function isRowComplete(row: FilterRow): row is CompleteFilterRow {
  if (!row.field || !row.condition || row.value == null) {
    return false;
  }

  if (row.condition === "between") {
    return (
      Array.isArray(row.value) && row.value[0] != null && row.value[1] != null
    );
  }

  if (row.condition === "is_in" || row.condition === "is_not_in") {
    return Array.isArray(row.value) && row.value.length > 0;
  }

  return true;
}

function toResultValue(value: FilterValue): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toResultValue(item as FilterValue));
  }

  return value;
}

export function buildResult<T = Record<string, unknown>>(
  state: FilterState,
): FilterFor<T> {
  const result: Record<string, unknown> = {};

  for (const row of state.rows) {
    if (!isRowComplete(row)) {
      continue;
    }

    if (row.condition === "equals" || row.condition === "is_in") {
      result[row.field] = toResultValue(row.value);
      continue;
    }

    if (row.condition === "between") {
      const [min, max] = row.value;
      const existing =
        typeof result[row.field] === "object" && result[row.field] !== null
          ? (result[row.field] as Record<string, unknown>)
          : {};

      result[row.field] = {
        ...existing,
        gte: toResultValue(min),
        lte: toResultValue(max),
      };
      continue;
    }

    const operator = conditionToOperator[row.condition];

    if (!operator) {
      continue;
    }

    const existing = result[row.field];

    if (
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing)
    ) {
      result[row.field] = {
        ...existing,
        [operator]: toResultValue(row.value),
      };
    } else {
      result[row.field] = { [operator]: toResultValue(row.value) };
    }
  }

  return result as FilterFor<T>;
}
