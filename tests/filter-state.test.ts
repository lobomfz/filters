import { describe, expect, it } from "bun:test";
import {
  addRow,
  addRowWithField,
  buildResult,
  clearState,
  columnFor,
  conditionsFor,
  createInitialState,
  hasManualRows,
  removeRow,
  restoreRows,
  setRowCondition,
  setRowField,
  setRowValue,
} from "../src/filters/filter-state.js";
import type { FilterDescriptor } from "../src/filters/index.js";

const descriptor: FilterDescriptor<{ amount: number; price: number }> = {
  columns: [
    {
      key: "amount",
      type: "number",
      conditions: [
        { key: "equals", label: "equals" },
        { key: "not_equals", label: "not equals" },
        { key: "gt", label: "greater than" },
      ],
    },
    {
      key: "price",
      type: "number",
      conditions: [{ key: "equals", label: "equals" }],
    },
  ],
};

describe("createInitialState", () => {
  it("returns empty state", () => {
    const state = createInitialState();

    expect(state.rows).toEqual([]);
    expect(state.manualRowIds.size).toBe(0);
  });
});

describe("addRow", () => {
  it("appends a blank row", () => {
    const state = addRow(createInitialState());

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]!.field).toBeUndefined();
    expect(state.rows[0]!.condition).toBeUndefined();
    expect(state.rows[0]!.value).toBeUndefined();
  });

  it("marks row as manual", () => {
    const state = addRow(createInitialState());

    expect(state.manualRowIds.has(state.rows[0]!.id)).toBe(true);
  });

  it("assigns unique ids", () => {
    let state = createInitialState();
    state = addRow(state);
    state = addRow(state);

    expect(state.rows[0]!.id).not.toBe(state.rows[1]!.id);
  });
});

describe("addRowWithField", () => {
  it("appends row with field pre-set", () => {
    const state = addRowWithField(createInitialState(), "amount");

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]!.field).toBe("amount");
    expect(state.rows[0]!.condition).toBeUndefined();
  });

  it("marks row as manual", () => {
    const state = addRowWithField(createInitialState(), "amount");

    expect(state.manualRowIds.has(state.rows[0]!.id)).toBe(true);
  });
});

describe("removeRow", () => {
  it("removes row by index", () => {
    let state = createInitialState();
    state = addRow(state);
    state = addRow(state);
    state = removeRow(state, 0);

    expect(state.rows).toHaveLength(1);
  });

  it("removes row from manualRowIds", () => {
    let state = createInitialState();
    state = addRow(state);
    const removedId = state.rows[0]!.id;
    state = removeRow(state, 0);

    expect(state.manualRowIds.has(removedId)).toBe(false);
  });
});

describe("setRowField", () => {
  it("sets field on row", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");

    expect(state.rows[0]!.field).toBe("amount");
  });

  it("clears condition when field changes", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowField(state, 0, "price");

    expect(state.rows[0]!.field).toBe("price");
    expect(state.rows[0]!.condition).toBeUndefined();
  });

  it("clears value when field changes", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, 100);
    state = setRowField(state, 0, "price");

    expect(state.rows[0]!.value).toBeUndefined();
  });
});

describe("setRowCondition", () => {
  it("sets condition on row", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "gt");

    expect(state.rows[0]!.condition).toBe("gt");
  });

  it("clears value when condition changes", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, 100);
    state = setRowCondition(state, 0, "gt");

    expect(state.rows[0]!.value).toBeUndefined();
  });
});

describe("setRowValue", () => {
  it("sets value on row", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, 42);

    expect(state.rows[0]!.value).toBe(42);
  });
});

describe("restoreRows", () => {
  it("creates state from serialized rows", () => {
    const state = restoreRows([
      { field: "amount", condition: "equals", value: 100 },
      { field: "price", condition: "gt", value: 50 },
    ]);

    expect(state.rows).toHaveLength(2);
    expect(state.rows[0]!.field).toBe("amount");
    expect(state.rows[1]!.field).toBe("price");
  });

  it("assigns unique ids", () => {
    const state = restoreRows([
      { field: "amount", condition: "equals", value: 100 },
      { field: "price", condition: "gt", value: 50 },
    ]);

    expect(state.rows[0]!.id).not.toBe(state.rows[1]!.id);
  });

  it("does not mark rows as manual", () => {
    const state = restoreRows([
      { field: "amount", condition: "equals", value: 100 },
    ]);

    expect(state.manualRowIds.size).toBe(0);
  });
});

describe("clearState", () => {
  it("returns empty state", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = clearState();

    expect(state.rows).toEqual([]);
    expect(state.manualRowIds.size).toBe(0);
  });
});

describe("hasManualRows", () => {
  it("returns false for empty state", () => {
    expect(hasManualRows(createInitialState())).toBe(false);
  });

  it("returns false for incomplete manual row", () => {
    const state = addRow(createInitialState());

    expect(hasManualRows(state)).toBe(false);
  });

  it("returns true for complete manual row", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, 42);

    expect(hasManualRows(state)).toBe(true);
  });

  it("returns false for restored rows", () => {
    const state = restoreRows([
      { field: "amount", condition: "equals", value: 100 },
    ]);

    expect(hasManualRows(state)).toBe(false);
  });
});

describe("conditionsFor", () => {
  it("returns conditions for existing field", () => {
    const conditions = conditionsFor(descriptor, "amount");

    expect(conditions).toHaveLength(3);
    expect(conditions[0]!.key).toBe("equals");
  });

  it("returns empty array for unknown field", () => {
    const conditions = conditionsFor(descriptor, "unknown");

    expect(conditions).toEqual([]);
  });
});

describe("columnFor", () => {
  it("returns column for existing field", () => {
    const column = columnFor(descriptor, "amount");

    expect(column.key).toBe("amount");
    expect(column.type).toBe("number");
  });

  it("throws for unknown field", () => {
    expect(() => columnFor(descriptor, "unknown")).toThrow();
  });
});

describe("buildResult", () => {
  it("returns empty object for empty state", () => {
    const result = buildResult(createInitialState());

    expect(result).toEqual({});
  });

  it("skips incomplete rows", () => {
    const state = addRow(createInitialState());
    const result = buildResult(state);

    expect(result).toEqual({});
  });

  it("builds equals condition", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, 100);

    const result = buildResult<{ amount: number }>(state);

    expect(result).toEqual({ amount: 100 });
  });

  it("builds not_equals condition", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "not_equals");
    state = setRowValue(state, 0, 50);

    const result = buildResult<{ amount: number }>(state);

    expect(result).toEqual({ amount: { not: 50 } });
  });

  it("builds gt condition", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "gt");
    state = setRowValue(state, 0, 50);

    const result = buildResult<{ amount: number }>(state);

    expect(result).toEqual({ amount: { gt: 50 } });
  });

  it("builds between condition", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "between");
    state = setRowValue(state, 0, [10, 100]);

    const result = buildResult<{ amount: number }>(state);

    expect(result).toEqual({ amount: { gte: 10, lte: 100 } });
  });

  it("skips between with incomplete tuple", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "between");
    state = setRowValue(state, 0, [10, undefined]);

    const result = buildResult(state);

    expect(result).toEqual({});
  });

  it("builds date equals with relative date value", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "due_on");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, { startOf: "day" });

    const result = buildResult<{ due_on: Date }>(state);

    expect(result).toEqual({ due_on: { startOf: "day" } });
  });

  it("builds date equals with ISO string from Date state", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "due_on");
    state = setRowCondition(state, 0, "equals");
    state = setRowValue(state, 0, new Date("2024-01-15T00:00:00.000Z"));

    const result = buildResult<{ due_on: Date }>(state);

    expect(result).toEqual({ due_on: "2024-01-15T00:00:00.000Z" });
  });

  it("builds date operator with ISO string from Date state", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "due_on");
    state = setRowCondition(state, 0, "gt");
    state = setRowValue(state, 0, new Date("2024-01-15T00:00:00.000Z"));

    const result = buildResult<{ due_on: Date }>(state);

    expect(result).toEqual({
      due_on: { gt: "2024-01-15T00:00:00.000Z" },
    });
  });

  it("builds string not_equals as operator object", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "name");
    state = setRowCondition(state, 0, "not_equals");
    state = setRowValue(state, 0, "test");

    const result = buildResult<{ name: string }>(state);

    expect(result).toEqual({ name: { not: "test" } });
  });

  it("merges multiple operators on same field", () => {
    let state = createInitialState();

    state = addRow(state);
    state = setRowField(state, 0, "amount");
    state = setRowCondition(state, 0, "gte");
    state = setRowValue(state, 0, 10);

    state = addRow(state);
    state = setRowField(state, 1, "amount");
    state = setRowCondition(state, 1, "lte");
    state = setRowValue(state, 1, 50);

    const result = buildResult<{ amount: number }>(state);

    expect(result).toEqual({ amount: { gte: 10, lte: 50 } });
  });

  it("builds is_in as direct array", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "status");
    state = setRowCondition(state, 0, "is_in");
    state = setRowValue(state, 0, ["pending", "paid"]);

    const result = buildResult<{
      status: "pending" | "paid" | "overdue";
    }>(state);

    expect(result).toEqual({ status: ["pending", "paid"] });
  });

  it("builds is_not_in as notIn operator", () => {
    let state = addRow(createInitialState());
    state = setRowField(state, 0, "status");
    state = setRowCondition(state, 0, "is_not_in");
    state = setRowValue(state, 0, ["overdue"]);

    const result = buildResult<{
      status: "pending" | "paid" | "overdue";
    }>(state);

    expect(result).toEqual({ status: { notIn: ["overdue"] } });
  });
});
