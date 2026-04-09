import { beforeEach, describe, expect, it, setSystemTime } from "bun:test";
import type { FilterInput } from "../src/types.js";
import {
  boolFilter,
  database,
  dateFilter,
  db,
  enumFilter,
  filter,
  multiFilter,
  multiSearchFilter,
  searchFilter,
  seed,
  stringFilter,
} from "./setup.js";

async function query(input: FilterInput<{ amount: number }>) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(filter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function queryMulti(
  input: FilterInput<{ amount: number; price: number }>,
) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(multiFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function queryString(input: FilterInput<{ name: string }>) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(stringFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function querySearch(
  input: FilterInput<{ amount: number; name: string }>,
) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(searchFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function queryMultiSearch(
  input: FilterInput<{ name: string; description: string }>,
) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(multiSearchFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function queryDate(input: FilterInput<{ due_on: Date }>) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(dateFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

function compileDate(input: FilterInput<{ due_on: Date }>) {
  return db
    .selectFrom("items")
    .selectAll()
    .where(dateFilter.where(input))
    .compile();
}

function compileNumber(input: FilterInput<{ amount: number }>) {
  return db
    .selectFrom("items")
    .selectAll()
    .where(filter.where(input))
    .compile();
}

async function queryBool(input: FilterInput<{ active: boolean }>) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(boolFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

async function queryEnum(
  input: FilterInput<{
    status: "pending" | "paid" | "overdue";
  }>,
) {
  return await db
    .selectFrom("items")
    .selectAll()
    .where(enumFilter.where(input))
    .orderBy("id", "asc")
    .execute();
}

describe("where", () => {
  beforeEach(async () => {
    database.reset();
    await seed();
  });

  it("filters by equals", async () => {
    const rows = await query({ filter: { amount: 100 } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(3);
    expect(rows[1]!.id).toBe(4);
  });

  it("returns all rows with empty filter", async () => {
    const rows = await query({});

    expect(rows).toHaveLength(4);
  });

  it("returns all rows with undefined filter", async () => {
    const rows = await query({ filter: undefined });

    expect(rows).toHaveLength(4);
  });

  it("returns empty when no match", async () => {
    const rows = await query({ filter: { amount: 999 } });

    expect(rows).toHaveLength(0);
  });

  it("filters by not", async () => {
    const rows = await query({ filter: { amount: { not: 100 } } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
  });

  it("filters by gt", async () => {
    const rows = await query({ filter: { amount: { gt: 50 } } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(3);
    expect(rows[1]!.id).toBe(4);
  });

  it("filters by gte", async () => {
    const rows = await query({ filter: { amount: { gte: 50 } } });

    expect(rows).toHaveLength(3);
    expect(rows[0]!.id).toBe(2);
    expect(rows[1]!.id).toBe(3);
    expect(rows[2]!.id).toBe(4);
  });

  it("filters by lt", async () => {
    const rows = await query({ filter: { amount: { lt: 50 } } });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(1);
  });

  it("filters by lte", async () => {
    const rows = await query({ filter: { amount: { lte: 50 } } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
  });

  it("filters by between (gte + lte)", async () => {
    const rows = await query({
      filter: { amount: { gte: 10, lte: 50 } },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
  });

  it("combines filters on multiple fields with AND", async () => {
    const rows = await queryMulti({
      filter: { amount: { gte: 50 }, price: { lt: 100 } },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(2);
    expect(rows[1]!.id).toBe(3);
  });

  it("ignores undefined filter fields", async () => {
    const rows = await query({ filter: { amount: undefined } });

    expect(rows).toHaveLength(4);
  });
});

describe("string where", () => {
  beforeEach(async () => {
    database.reset();
    await seed();
  });

  it("filters by string equals", async () => {
    const rows = await queryString({ filter: { name: "Widget" } });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(1);
  });

  it("filters by string not", async () => {
    const rows = await queryString({ filter: { name: { not: "Widget" } } });

    expect(rows).toHaveLength(3);
  });
});

describe("text search", () => {
  beforeEach(async () => {
    database.reset();
    await seed();
  });

  it("matches with LIKE pattern", async () => {
    const rows = await querySearch({ query: "widget" });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(3);
  });

  it("searches across multiple fields with OR", async () => {
    const rows = await queryMultiSearch({ query: "cool" });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(2);
  });

  it("combines with field filter via AND", async () => {
    const rows = await querySearch({
      filter: { amount: { gte: 100 } },
      query: "widget",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(3);
  });

  it("ignores empty query string", async () => {
    const rows = await querySearch({ query: "" });

    expect(rows).toHaveLength(4);
  });

  it("treats wildcard characters as literals", async () => {
    const rows = await querySearch({ query: "%" });

    expect(rows).toHaveLength(0);
  });
});

describe("date where", () => {
  beforeEach(async () => {
    setSystemTime();
    database.reset();
    await seed();
  });

  it("formats direct date values as YYYY-MM-DD", () => {
    const compiled = compileDate({
      filter: { due_on: "2024-01-15T00:00:00.000Z" },
    });

    expect(compiled.parameters).toEqual(["2024-01-15"]);
  });

  it("formats resolved relative dates as YYYY-MM-DD", () => {
    setSystemTime(new Date("2024-06-15T14:30:00Z"));

    const compiled = compileDate({
      filter: { due_on: { gte: { startOf: "month" } } },
    });

    expect(compiled.parameters).toEqual(["2024-06-01"]);
  });

  it("does not format non-date columns", () => {
    const compiled = compileNumber({
      filter: { amount: { gte: 50 } },
    });

    expect(compiled.parameters).toEqual([50]);
  });

  it("filters by date equals", async () => {
    const rows = await queryDate({
      filter: { due_on: "2024-01-15T00:00:00.000Z" },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(1);
  });

  it("filters by date not", async () => {
    const rows = await queryDate({
      filter: { due_on: { not: "2024-01-15T00:00:00.000Z" } },
    });

    expect(rows).toHaveLength(3);
  });

  it("filters by date gt", async () => {
    const rows = await queryDate({
      filter: { due_on: { gt: "2024-06-01T12:00:00.000Z" } },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(3);
    expect(rows[1]!.id).toBe(4);
  });

  it("filters by date lt", async () => {
    const rows = await queryDate({
      filter: { due_on: { lt: "2024-06-01T12:00:00.000Z" } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(1);
  });

  it("filters by date between", async () => {
    const rows = await queryDate({
      filter: {
        due_on: {
          gte: "2024-01-15T00:00:00.000Z",
          lte: "2024-12-25T00:00:00.000Z",
        },
      },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
    expect(rows[2]!.id).toBe(3);
  });

  it("resolves top-level relative date for equality", async () => {
    setSystemTime(new Date("2024-06-15T14:30:00Z"));

    await db
      .insertInto("items")
      .values({
        id: 5,
        amount: 0,
        price: 0,
        name: "Exact",
        description: "test",
        due_on: "2024-06-15",
        active: 1,
        status: "pending",
      })
      .execute();

    const rows = await queryDate({
      filter: { due_on: { startOf: "day" } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(5);
  });

  it("resolves relative date in operator", async () => {
    setSystemTime(new Date("2024-06-15T14:30:00Z"));

    const rows = await queryDate({
      filter: { due_on: { gte: { startOf: "month" } } },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]!.id).toBe(2);
    expect(rows[1]!.id).toBe(3);
    expect(rows[2]!.id).toBe(4);
  });
});

describe("boolean where", () => {
  beforeEach(async () => {
    database.reset();
    await seed();
  });

  it("filters by boolean true", async () => {
    const rows = await queryBool({ filter: { active: true } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
  });

  it("filters by boolean false", async () => {
    const rows = await queryBool({ filter: { active: false } });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(3);
    expect(rows[1]!.id).toBe(4);
  });
});

describe("enum where", () => {
  beforeEach(async () => {
    database.reset();
    await seed();
  });

  it("filters by single value", async () => {
    const rows = await queryEnum({ filter: { status: "paid" } });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(2);
  });

  it("filters by IN array", async () => {
    const rows = await queryEnum({
      filter: { status: ["pending", "paid"] },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]!.id).toBe(1);
    expect(rows[1]!.id).toBe(2);
    expect(rows[2]!.id).toBe(4);
  });

  it("filters by NOT IN", async () => {
    const rows = await queryEnum({
      filter: { status: { notIn: ["pending"] } },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(2);
    expect(rows[1]!.id).toBe(3);
  });

  it("returns all rows with empty filter", async () => {
    const rows = await queryEnum({});

    expect(rows).toHaveLength(4);
  });
});
