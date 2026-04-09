import { describe, expect, it } from "bun:test";
import {
  isRelativeDate,
  resolveRelativeDate,
} from "../src/filters/relative-dates.js";

describe("isRelativeDate", () => {
  it("returns true for startOf", () => {
    expect(isRelativeDate({ startOf: "day" })).toBe(true);
  });

  it("returns true for endOf", () => {
    expect(isRelativeDate({ endOf: "month" })).toBe(true);
  });

  it("returns false for string", () => {
    expect(isRelativeDate("2024-01-15")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isRelativeDate(42)).toBe(false);
  });

  it("returns false for Date instance", () => {
    expect(isRelativeDate(new Date())).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRelativeDate(null)).toBe(false);
  });

  it("returns false for plain object", () => {
    expect(isRelativeDate({ foo: "bar" })).toBe(false);
  });
});

describe("resolveRelativeDate", () => {
  const now = new Date("2024-06-15T14:30:00Z");

  it("resolves startOf day", () => {
    const result = resolveRelativeDate({ startOf: "day" }, "America/Sao_Paulo", now);

    expect(result.toISOString()).toBe("2024-06-15T03:00:00.000Z");
  });

  it("resolves endOf day", () => {
    const result = resolveRelativeDate({ endOf: "day" }, "America/Sao_Paulo", now);

    expect(result.toISOString()).toBe("2024-06-16T02:59:59.999Z");
  });

  it("resolves startOf month", () => {
    const result = resolveRelativeDate({ startOf: "month" }, "America/Sao_Paulo", now);

    expect(result.toISOString()).toBe("2024-06-01T03:00:00.000Z");
  });

  it("resolves endOf month", () => {
    const result = resolveRelativeDate({ endOf: "month" }, "America/Sao_Paulo", now);

    expect(result.toISOString()).toBe("2024-07-01T02:59:59.999Z");
  });

  it("resolves startOf week", () => {
    const result = resolveRelativeDate({ startOf: "week" }, "America/Sao_Paulo", now);

    expect(result.toISOString()).toBe("2024-06-09T03:00:00.000Z");
  });

  it("respects timezone difference", () => {
    const spResult = resolveRelativeDate({ startOf: "day" }, "America/Sao_Paulo", now);
    const utcResult = resolveRelativeDate({ startOf: "day" }, "UTC", now);

    expect(spResult.toISOString()).not.toBe(utcResult.toISOString());
  });
});
