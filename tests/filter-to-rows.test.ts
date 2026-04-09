import { describe, expect, it } from "bun:test";
import { filterToRows } from "../src/index.js";
import { dateFilter, enumFilter, filter, stringFilter } from "./setup.js";

describe("filterToRows", () => {
  it("converts scalar equality to equals row", () => {
    const rows = filterToRows(filter.describe(), { amount: 100 });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      field: "amount",
      condition: "equals",
      value: 100,
    });
  });

  it("converts arrays to is_in row", () => {
    const rows = filterToRows(enumFilter.describe(), {
      status: ["pending", "paid"],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      field: "status",
      condition: "is_in",
      value: ["pending", "paid"],
    });
  });

  it("converts operator variants to rows", () => {
    const rows = filterToRows(filter.describe(), {
      amount: {
        not: 10,
        gt: 20,
        gte: 30,
        lt: 40,
      },
    });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.condition)).toEqual([
      "not_equals",
      "gt",
      "gte",
      "lt",
    ]);
  });

  it("converts gte plus lte to a between row", () => {
    const rows = filterToRows(filter.describe(), {
      amount: { gte: 10, lte: 50 },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      field: "amount",
      condition: "between",
      value: [10, 50],
    });
  });

  it("keeps relative dates without resolving them", () => {
    const rows = filterToRows(dateFilter.describe(), {
      due_on: { gte: { startOf: "month" } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      field: "due_on",
      condition: "gte",
      value: { startOf: "month" },
    });
  });

  it("converts date strings to Date values", () => {
    const rows = filterToRows(dateFilter.describe(), {
      due_on: "2024-01-15T00:00:00.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBeInstanceOf(Date);
    expect((rows[0]!.value as Date).toISOString()).toBe(
      "2024-01-15T00:00:00.000Z",
    );
  });

  it("ignores unknown fields", () => {
    const rows = filterToRows(filter.describe(), {
      unknown_field: 100,
    });

    expect(rows).toEqual([]);
  });

  it("skips null values", () => {
    const rows = filterToRows(stringFilter.describe(), {
      name: null,
    });

    expect(rows).toEqual([]);
  });

  it("creates multiple rows for the same field", () => {
    const rows = filterToRows(stringFilter.describe(), {
      name: { not: "Widget" },
    }).concat(
      filterToRows(stringFilter.describe(), {
        name: { not: "Gadget" },
      }),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      field: "name",
      condition: "not_equals",
      value: "Widget",
    });
    expect(rows[1]).toMatchObject({
      field: "name",
      condition: "not_equals",
      value: "Gadget",
    });
  });

  it("creates multiple rows when a field has multiple operators", () => {
    const rows = filterToRows(filter.describe(), {
      amount: { not: 10, gt: 20 },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      field: "amount",
      condition: "not_equals",
      value: 10,
    });
    expect(rows[1]).toMatchObject({
      field: "amount",
      condition: "gt",
      value: 20,
    });
  });
});
