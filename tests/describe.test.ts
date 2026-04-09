import { describe, expect, it } from "bun:test";
import {
  boolFilter,
  dateFilter,
  enumFilter,
  filter,
  multiFilter,
  stringFilter,
} from "./setup.js";

describe("describe", () => {
  it("returns descriptor with number column", () => {
    const descriptor = filter.describe();

    expect(descriptor.columns).toHaveLength(1);

    const col = descriptor.columns[0]!;

    expect(col.key).toBe("amount");
    expect(col.type).toBe("number");
  });

  it("lists all number conditions", () => {
    const descriptor = filter.describe();
    const conditions = descriptor.columns[0]!.conditions.map((c) => c.key);

    expect(conditions).toEqual([
      "equals",
      "not_equals",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
    ]);
  });

  it("returns multiple columns when configured", () => {
    const descriptor = multiFilter.describe();

    expect(descriptor.columns).toHaveLength(2);
    expect(descriptor.columns.map((c) => c.key)).toEqual(["amount", "price"]);
  });

  it("all columns have type number", () => {
    const descriptor = multiFilter.describe();

    for (const col of descriptor.columns) {
      expect(col.type).toBe("number");
    }
  });

  it("does not include values for number columns", () => {
    const descriptor = filter.describe();

    expect(descriptor.columns[0]!.values).toBeUndefined();
  });

  it("returns string column with correct type", () => {
    const descriptor = stringFilter.describe();

    expect(descriptor.columns).toHaveLength(1);

    const col = descriptor.columns[0]!;

    expect(col.key).toBe("name");
    expect(col.type).toBe("string");
  });

  it("lists string conditions", () => {
    const descriptor = stringFilter.describe();
    const conditions = descriptor.columns[0]!.conditions.map((c) => c.key);

    expect(conditions).toEqual(["equals", "not_equals"]);
  });

  it("returns date column with correct type", () => {
    const descriptor = dateFilter.describe();

    expect(descriptor.columns).toHaveLength(1);

    const col = descriptor.columns[0]!;

    expect(col.key).toBe("due_on");
    expect(col.type).toBe("date");
  });

  it("lists date conditions", () => {
    const descriptor = dateFilter.describe();
    const conditions = descriptor.columns[0]!.conditions.map((c) => c.key);

    expect(conditions).toEqual(["equals", "not_equals", "gt", "lt", "between"]);
  });

  it("returns boolean column with correct type", () => {
    const descriptor = boolFilter.describe();

    expect(descriptor.columns).toHaveLength(1);

    const col = descriptor.columns[0]!;

    expect(col.key).toBe("active");
    expect(col.type).toBe("boolean");
  });

  it("boolean has only equals condition", () => {
    const descriptor = boolFilter.describe();
    const conditions = descriptor.columns[0]!.conditions.map((c) => c.key);

    expect(conditions).toEqual(["equals"]);
  });

  it("auto-detects enum from literal union", () => {
    const descriptor = enumFilter.describe();

    expect(descriptor.columns).toHaveLength(1);

    const col = descriptor.columns[0]!;

    expect(col.key).toBe("status");
    expect(col.type).toBe("enum");
  });

  it("enum includes values from schema", () => {
    const descriptor = enumFilter.describe();
    const col = descriptor.columns[0]!;

    expect(col.values).toEqual(["overdue", "paid", "pending"]);
  });

  it("enum has is_in and is_not_in conditions", () => {
    const descriptor = enumFilter.describe();
    const conditions = descriptor.columns[0]!.conditions.map((c) => c.key);

    expect(conditions).toEqual(["is_in", "is_not_in"]);
  });
});
