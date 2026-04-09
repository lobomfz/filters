import { describe, expect, it } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import type { FilterDescriptor } from "../src/filters/index.js";
import { useFilterBuilder } from "../src/react/use-filter-builder.js";
const descriptor: FilterDescriptor<{ amount: number; name: string }> = {
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
      key: "name",
      type: "string",
      conditions: [
        { key: "equals", label: "equals" },
        { key: "not_equals", label: "not equals" },
      ],
    },
  ],
};

describe("useFilterBuilder", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    expect(result.current.rows).toEqual([]);
    expect(result.current.result).toEqual({});
    expect(result.current.hasManualRows).toBe(false);
    expect(result.current.columns).toBe(descriptor.columns);
  });

  it("add appends a blank row", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]!.field).toBeUndefined();
    expect(result.current.hasManualRows).toBe(false);
  });

  it("addWithField appends row with field pre-set", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.addWithField("amount");
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]!.field).toBe("amount");
  });

  it("remove removes row by index", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
      result.current.add();
    });

    act(() => {
      result.current.remove(0);
    });

    expect(result.current.rows).toHaveLength(1);
  });

  it("setField sets field on row", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    expect(result.current.rows[0]!.field).toBe("amount");
  });

  it("setCondition sets condition on row", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    act(() => {
      result.current.setCondition(0, "equals");
    });

    expect(result.current.rows[0]!.condition).toBe("equals");
  });

  it("setValue sets value on row", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    act(() => {
      result.current.setCondition(0, "equals");
    });

    act(() => {
      result.current.setValue(0, 42);
    });

    expect(result.current.rows[0]!.value).toBe(42);
  });

  it("clear resets to empty state", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.rows).toEqual([]);
    expect(result.current.hasManualRows).toBe(false);
  });

  it("restore creates state from serialized rows", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.restore([
        { field: "amount", condition: "equals", value: 100 },
      ]);
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]!.field).toBe("amount");
    expect(result.current.rows[0]!.value).toBe(100);
    expect(result.current.hasManualRows).toBe(false);
  });

  it("result updates when state changes", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    act(() => {
      result.current.setCondition(0, "equals");
    });

    act(() => {
      result.current.setValue(0, 42);
    });

    expect(result.current.result).toEqual({ amount: 42 });
  });

  it("result reflects restored rows", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.restore([{ field: "amount", condition: "gt", value: 50 }]);
    });

    expect(result.current.result).toEqual({ amount: { gt: 50 } });
  });

  it("conditionsFor delegates to pure function", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    const conditions = result.current.conditionsFor("amount");

    expect(conditions).toHaveLength(3);
    expect(conditions[0]!.key).toBe("equals");
  });

  it("conditionsFor returns empty for unknown field", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    expect(result.current.conditionsFor("unknown")).toEqual([]);
  });

  it("columnFor delegates to pure function", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    const column = result.current.columnFor("amount");

    expect(column.key).toBe("amount");
    expect(column.type).toBe("number");
  });

  it("columnFor throws for unknown field", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    expect(() => result.current.columnFor("unknown")).toThrow();
  });

  it("hasManualRows returns true for complete manual row", () => {
    const { result } = renderHook(() => useFilterBuilder(descriptor));

    act(() => {
      result.current.add();
    });

    act(() => {
      result.current.setField(0, "amount");
    });

    act(() => {
      result.current.setCondition(0, "equals");
    });

    act(() => {
      result.current.setValue(0, 42);
    });

    expect(result.current.hasManualRows).toBe(true);
  });
});
