import type { FilterFor, RelativeDate, RelativeDateUnit } from "../types.js";
import type { ColumnType, FilterDescriptor } from "./index.js";
import { isRelativeDate } from "./relative-dates.js";

const RELATIVE_DATE_UNIT_MAP: Record<RelativeDateUnit, true> = {
  day: true,
  week: true,
  month: true,
};

function formatRelativeDate(rd: RelativeDate): string {
  if ("startOf" in rd) {
    return `startOf:${rd.startOf}`;
  }

  return `endOf:${rd.endOf}`;
}

function toRelativeDate(
  prefix: "startOf" | "endOf",
  value: string,
): RelativeDate | undefined {
  if (!(value in RELATIVE_DATE_UNIT_MAP)) {
    return undefined;
  }

  if (prefix === "startOf") {
    return { startOf: value as RelativeDateUnit };
  }

  return { endOf: value as RelativeDateUnit };
}

function coerceValue(raw: string, colType: ColumnType): unknown {
  if (colType === "number") {
    if (raw.trim() === "") {
      return undefined;
    }

    const value = Number(raw);

    return Number.isFinite(value) ? value : undefined;
  }

  if (colType === "boolean") {
    if (raw === "true") {
      return true;
    }

    if (raw === "false") {
      return false;
    }

    return undefined;
  }

  if (colType === "date") {
    if (raw.startsWith("startOf:")) {
      return toRelativeDate("startOf", raw.slice(8));
    }

    if (raw.startsWith("endOf:")) {
      return toRelativeDate("endOf", raw.slice(6));
    }
  }

  return raw;
}

export function serializeFilter<T>(
  filter: FilterFor<T>,
  descriptor: FilterDescriptor<T>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const col of descriptor.columns) {
    const value = (filter as Record<string, unknown>)[col.key];

    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(col.key, String(item));
      }

      continue;
    }

    if (isRelativeDate(value)) {
      params.append(col.key, formatRelativeDate(value));
      continue;
    }

    if (typeof value !== "object" || value === null) {
      params.append(col.key, String(value));
      continue;
    }

    for (const [opKey, opValue] of Object.entries(value)) {
      if (opValue === undefined) {
        continue;
      }

      if (Array.isArray(opValue)) {
        for (const item of opValue) {
          params.append(`${col.key}.${opKey}`, String(item));
        }

        continue;
      }

      if (isRelativeDate(opValue)) {
        params.append(`${col.key}.${opKey}`, formatRelativeDate(opValue));
        continue;
      }

      params.append(`${col.key}.${opKey}`, String(opValue));
    }
  }

  return params;
}

export function deserializeFilter<T>(
  params: URLSearchParams,
  descriptor: FilterDescriptor<T>,
): FilterFor<T> {
  const result: Record<string, unknown> = {};
  const columnMap = new Map(
    descriptor.columns.map((c) => [c.key as string, c]),
  );

  const grouped = new Map<string, string[]>();

  for (const [key, value] of params) {
    const existing = grouped.get(key);

    if (existing) {
      existing.push(value);
    } else {
      grouped.set(key, [value]);
    }
  }

  for (const [rawKey, values] of grouped) {
    const dotIndex = rawKey.indexOf(".");

    if (dotIndex === -1) {
      const col = columnMap.get(rawKey);

      if (!col) {
        continue;
      }

      if (values.length > 1) {
        if (col.type !== "enum") {
          continue;
        }

        result[rawKey] = values;
        continue;
      }

      const value = coerceValue(values[0]!, col.type);

      if (value === undefined) {
        continue;
      }

      result[rawKey] = value;
    } else {
      const field = rawKey.slice(0, dotIndex);
      const operator = rawKey.slice(dotIndex + 1);

      const col = columnMap.get(field);

      if (!col) {
        continue;
      }

      const existing =
        typeof result[field] === "object" &&
        result[field] !== null &&
        !Array.isArray(result[field])
          ? (result[field] as Record<string, unknown>)
          : {};

      if (operator === "notIn") {
        existing[operator] = values;
      } else {
        const value = coerceValue(values[0]!, col.type);

        if (value === undefined) {
          continue;
        }

        existing[operator] = value;
      }

      result[field] = existing;
    }
  }

  return result as FilterFor<T>;
}
