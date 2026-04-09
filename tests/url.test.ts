import { describe, expect, it } from "bun:test";
import { deserializeFilter, serializeFilter } from "../src/filters/url.js";
import type { FilterDescriptor } from "../src/filters/index.js";
import type { FilterFor } from "../src/types.js";

const numberDesc: FilterDescriptor<{ amount: number }> = {
  columns: [
    {
      key: "amount",
      type: "number",
      conditions: [
        { key: "equals", label: "equals" },
        { key: "gt", label: "gt" },
      ],
    },
  ],
};

const stringDesc: FilterDescriptor<{ name: string }> = {
  columns: [
    {
      key: "name",
      type: "string",
      conditions: [{ key: "equals", label: "equals" }],
    },
  ],
};

const boolDesc: FilterDescriptor<{ active: boolean }> = {
  columns: [
    {
      key: "active",
      type: "boolean",
      conditions: [{ key: "equals", label: "equals" }],
    },
  ],
};

const dateDesc: FilterDescriptor<{ due_on: Date }> = {
  columns: [
    {
      key: "due_on",
      type: "date",
      conditions: [{ key: "equals", label: "equals" }],
    },
  ],
};

const enumDesc: FilterDescriptor<{
  status: "pending" | "paid" | "overdue";
}> = {
  columns: [
    {
      key: "status",
      type: "enum",
      conditions: [{ key: "is_in", label: "is in" }],
      values: ["pending", "paid", "overdue"],
    },
  ],
};

describe("serializeFilter", () => {
  it("serializes scalar number", () => {
    const params = serializeFilter({ amount: 50 }, numberDesc);

    expect(params.toString()).toBe("amount=50");
  });

  it("serializes scalar string", () => {
    const params = serializeFilter({ name: "test" }, stringDesc);

    expect(params.toString()).toBe("name=test");
  });

  it("serializes boolean true", () => {
    const params = serializeFilter({ active: true }, boolDesc);

    expect(params.toString()).toBe("active=true");
  });

  it("serializes boolean false", () => {
    const params = serializeFilter({ active: false }, boolDesc);

    expect(params.toString()).toBe("active=false");
  });

  it("serializes date string", () => {
    const params = serializeFilter(
      { due_on: "2024-01-15T00:00:00.000Z" },
      dateDesc,
    );

    expect(params.get("due_on")).toBe("2024-01-15T00:00:00.000Z");
  });

  it("serializes relative date at top level", () => {
    const params = serializeFilter(
      { due_on: { startOf: "day" } },
      dateDesc,
    );

    expect(params.toString()).toBe("due_on=startOf%3Aday");
  });

  it("serializes operator object with dot notation", () => {
    const params = serializeFilter({ amount: { gte: 10, lte: 50 } }, numberDesc);

    expect(params.get("amount.gte")).toBe("10");
    expect(params.get("amount.lte")).toBe("50");
  });

  it("serializes enum array as repeated params", () => {
    const params = serializeFilter(
      { status: ["pending", "paid"] },
      enumDesc,
    );

    expect(params.getAll("status")).toEqual(["pending", "paid"]);
  });

  it("serializes notIn as repeated dot-notation params", () => {
    const params = serializeFilter(
      { status: { notIn: ["overdue"] } },
      enumDesc,
    );

    expect(params.getAll("status.notIn")).toEqual(["overdue"]);
  });

  it("serializes relative date in operator", () => {
    const params = serializeFilter(
      { due_on: { gte: { startOf: "month" } } },
      dateDesc,
    );

    expect(params.get("due_on.gte")).toBe("startOf:month");
  });

  it("returns empty params for empty filter", () => {
    const params = serializeFilter({}, numberDesc);

    expect(params.toString()).toBe("");
  });

  it("skips undefined values", () => {
    const params = serializeFilter({ amount: undefined }, numberDesc);

    expect(params.toString()).toBe("");
  });
});

describe("deserializeFilter", () => {
  it("coerces number from string", () => {
    const params = new URLSearchParams("amount=50");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({ amount: 50 });
  });

  it("deserializes string value", () => {
    const params = new URLSearchParams("name=test");
    const filter = deserializeFilter(params, stringDesc);

    expect(filter).toEqual({ name: "test" });
  });

  it("coerces boolean true from string", () => {
    const params = new URLSearchParams("active=true");
    const filter = deserializeFilter(params, boolDesc);

    expect(filter).toEqual({ active: true });
  });

  it("coerces boolean false from string", () => {
    const params = new URLSearchParams("active=false");
    const filter = deserializeFilter(params, boolDesc);

    expect(filter).toEqual({ active: false });
  });

  it("deserializes date string", () => {
    const params = new URLSearchParams(
      "due_on=2024-01-15T00%3A00%3A00.000Z",
    );
    const filter = deserializeFilter(params, dateDesc);

    expect(filter).toEqual({ due_on: "2024-01-15T00:00:00.000Z" });
  });

  it("deserializes relative date notation", () => {
    const params = new URLSearchParams("due_on=startOf%3Aday");
    const filter = deserializeFilter(params, dateDesc);

    expect(filter).toEqual({ due_on: { startOf: "day" } });
  });

  it("deserializes endOf relative date", () => {
    const params = new URLSearchParams("due_on=endOf%3Amonth");
    const filter = deserializeFilter(params, dateDesc);

    expect(filter).toEqual({ due_on: { endOf: "month" } });
  });

  it("rebuilds operator from dot notation", () => {
    const params = new URLSearchParams("amount.gte=10&amount.lte=50");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({ amount: { gte: 10, lte: 50 } });
  });

  it("rebuilds enum array from repeated params", () => {
    const params = new URLSearchParams("status=pending&status=paid");
    const filter = deserializeFilter(params, enumDesc);

    expect(filter).toEqual({ status: ["pending", "paid"] });
  });

  it("ignores repeated params for scalar columns", () => {
    const params = new URLSearchParams("amount=10&amount=20");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({});
  });

  it("rebuilds notIn from repeated dot-notation params", () => {
    const params = new URLSearchParams(
      "status.notIn=overdue&status.notIn=pending",
    );
    const filter = deserializeFilter(params, enumDesc);

    expect(filter).toEqual({ status: { notIn: ["overdue", "pending"] } });
  });

  it("rebuilds notIn from single dot-notation param", () => {
    const params = new URLSearchParams("status.notIn=overdue");
    const filter = deserializeFilter(params, enumDesc);

    expect(filter).toEqual({ status: { notIn: ["overdue"] } });
  });

  it("deserializes relative date in operator", () => {
    const params = new URLSearchParams("due_on.gte=startOf%3Amonth");
    const filter = deserializeFilter(params, dateDesc);

    expect(filter).toEqual({ due_on: { gte: { startOf: "month" } } });
  });

  it("returns empty filter for empty params", () => {
    const params = new URLSearchParams();
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({});
  });

  it("ignores unknown params", () => {
    const params = new URLSearchParams("unknown=value&amount=50");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({ amount: 50 });
  });

  it("ignores unknown dot-notation params", () => {
    const params = new URLSearchParams("unknown.gte=10&amount=50");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({ amount: 50 });
  });

  it("ignores invalid number values", () => {
    const params = new URLSearchParams("amount=foo");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({});
  });

  it("ignores blank number values", () => {
    const params = new URLSearchParams("amount=");
    const filter = deserializeFilter(params, numberDesc);

    expect(filter).toEqual({});
  });

  it("ignores invalid boolean values", () => {
    const params = new URLSearchParams("active=maybe");
    const filter = deserializeFilter(params, boolDesc);

    expect(filter).toEqual({});
  });

  it("ignores invalid relative date values", () => {
    const params = new URLSearchParams("due_on=startOf%3Ayear");
    const filter = deserializeFilter(params, dateDesc);

    expect(filter).toEqual({});
  });
});

describe("round-trip", () => {
  it("number scalar", () => {
    const original = { amount: 42 };
    const params = serializeFilter(original, numberDesc);
    const result = deserializeFilter(params, numberDesc);

    expect(result).toEqual(original);
  });

  it("string scalar", () => {
    const original = { name: "hello world" };
    const params = serializeFilter(original, stringDesc);
    const result = deserializeFilter(params, stringDesc);

    expect(result).toEqual(original);
  });

  it("boolean true", () => {
    const original = { active: true };
    const params = serializeFilter(original, boolDesc);
    const result = deserializeFilter(params, boolDesc);

    expect(result).toEqual(original);
  });

  it("boolean false", () => {
    const original = { active: false };
    const params = serializeFilter(original, boolDesc);
    const result = deserializeFilter(params, boolDesc);

    expect(result).toEqual(original);
  });

  it("date string", () => {
    const original = { due_on: "2024-01-15T00:00:00.000Z" };
    const params = serializeFilter(original, dateDesc);
    const result = deserializeFilter(params, dateDesc);

    expect(result).toEqual(original);
  });

  it("relative date startOf", () => {
    const original: FilterFor<{ due_on: Date }> = {
      due_on: { startOf: "day" },
    };
    const params = serializeFilter(original, dateDesc);
    const result = deserializeFilter(params, dateDesc);

    expect(result).toEqual(original);
  });

  it("relative date endOf", () => {
    const original: FilterFor<{ due_on: Date }> = {
      due_on: { endOf: "month" },
    };
    const params = serializeFilter(original, dateDesc);
    const result = deserializeFilter(params, dateDesc);

    expect(result).toEqual(original);
  });

  it("number operator object", () => {
    const original = { amount: { gte: 10, lte: 100 } };
    const params = serializeFilter(original, numberDesc);
    const result = deserializeFilter(params, numberDesc);

    expect(result).toEqual(original);
  });

  it("not operator", () => {
    const original = { amount: { not: 50 } };
    const params = serializeFilter(original, numberDesc);
    const result = deserializeFilter(params, numberDesc);

    expect(result).toEqual(original);
  });

  it("enum array", () => {
    const original: FilterFor<{
      status: "pending" | "paid" | "overdue";
    }> = { status: ["pending", "paid"] };
    const params = serializeFilter(original, enumDesc);
    const result = deserializeFilter(params, enumDesc);

    expect(result).toEqual(original);
  });

  it("notIn operator", () => {
    const original: FilterFor<{
      status: "pending" | "paid" | "overdue";
    }> = { status: { notIn: ["overdue"] } };
    const params = serializeFilter(original, enumDesc);
    const result = deserializeFilter(params, enumDesc);

    expect(result).toEqual(original);
  });

  it("relative date in operator", () => {
    const original: FilterFor<{ due_on: Date }> = {
      due_on: { gte: { startOf: "month" } },
    };
    const params = serializeFilter(original, dateDesc);
    const result = deserializeFilter(params, dateDesc);

    expect(result).toEqual(original);
  });

  it("empty filter", () => {
    const original = {};
    const params = serializeFilter(original, numberDesc);
    const result = deserializeFilter(params, numberDesc);

    expect(result).toEqual(original);
  });
});
