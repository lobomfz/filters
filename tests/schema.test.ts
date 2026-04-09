import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import {
  boolFilter,
  dateFilter,
  enumFilter,
  filter,
  stringFilter,
} from "./setup.js";

describe("schema", () => {
  it("accepts valid number scalar", () => {
    const result = filter.schema({ filter: { amount: 100 } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts empty filter", () => {
    const result = filter.schema({});

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts filter with query", () => {
    const result = filter.schema({ filter: { amount: 10 }, query: "test" });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts operator object for number", () => {
    const result = filter.schema({ filter: { amount: { gt: 50 } } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts between shape (gte + lte)", () => {
    const result = filter.schema({
      filter: { amount: { gte: 10, lte: 50 } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts all number operators", () => {
    const result = filter.schema({
      filter: { amount: { not: 1, gt: 2, gte: 3, lt: 4, lte: 5 } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("rejects string in number filter", () => {
    const result = filter.schema({ filter: { amount: "not a number" } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("rejects string in operator value", () => {
    const result = filter.schema({
      filter: { amount: { gt: "not a number" } },
    });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("rejects boolean in number filter", () => {
    const result = filter.schema({ filter: { amount: true } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("accepts string scalar", () => {
    const result = stringFilter.schema({ filter: { name: "test" } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts string not operator", () => {
    const result = stringFilter.schema({
      filter: { name: { not: "test" } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("rejects number in string filter", () => {
    const result = stringFilter.schema({ filter: { name: 42 } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("accepts date string", () => {
    const result = dateFilter.schema({
      filter: { due_on: "2024-01-15T00:00:00.000Z" },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts relative date startOf", () => {
    const result = dateFilter.schema({
      filter: { due_on: { startOf: "day" } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts relative date endOf", () => {
    const result = dateFilter.schema({
      filter: { due_on: { endOf: "month" } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts date operator with string", () => {
    const result = dateFilter.schema({
      filter: { due_on: { gt: "2024-01-15" } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts date operator with relative date", () => {
    const result = dateFilter.schema({
      filter: { due_on: { gte: { startOf: "month" } } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts relative date operator through standard validation", async () => {
    const result = await dateFilter.schema["~standard"].validate({
      filter: { due_on: { lt: { startOf: "day" } } },
    });

    expect("issues" in result).toBe(false);
  });

  it("rejects number in date filter", () => {
    const result = dateFilter.schema({ filter: { due_on: 42 } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("accepts boolean true", () => {
    const result = boolFilter.schema({ filter: { active: true } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts boolean false", () => {
    const result = boolFilter.schema({ filter: { active: false } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("rejects string in boolean filter", () => {
    const result = boolFilter.schema({ filter: { active: "yes" as any } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("rejects number in boolean filter", () => {
    const result = boolFilter.schema({ filter: { active: 1 as any } });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("accepts single enum value", () => {
    const result = enumFilter.schema({ filter: { status: "pending" } });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts array of enum values", () => {
    const result = enumFilter.schema({
      filter: { status: ["pending", "paid"] },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("accepts notIn operator for enum", () => {
    const result = enumFilter.schema({
      filter: { status: { notIn: ["overdue"] } },
    });

    expect(result).not.toBeInstanceOf(type.errors);
  });

  it("rejects unknown enum value", () => {
    const result = enumFilter.schema({
      filter: { status: "unknown" as any },
    });

    expect(result).toBeInstanceOf(type.errors);
  });

  it("rejects number in enum filter", () => {
    const result = enumFilter.schema({ filter: { status: 123 as any } });

    expect(result).toBeInstanceOf(type.errors);
  });
});
