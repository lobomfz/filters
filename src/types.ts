export type RelativeDateUnit = "day" | "week" | "month";

export type RelativeDate =
  | { startOf: RelativeDateUnit }
  | { endOf: RelativeDateUnit };

export type NumberOperators = {
  not?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};

export type StringOperators = {
  not?: string;
};

export type DateValue = string | RelativeDate;

export type DateOperators = {
  not?: DateValue;
  gt?: DateValue;
  gte?: DateValue;
  lt?: DateValue;
  lte?: DateValue;
};

export type EnumOperators<T> = { notIn?: T[] };

export type FilterValueFor<T> = [T] extends [number]
  ? number | NumberOperators
  : [T] extends [boolean]
    ? boolean
    : [T] extends [string]
      ? string extends T
        ? string | StringOperators
        : T | T[] | EnumOperators<T>
      : [T] extends [Date]
        ? DateValue | DateOperators
        : never;

export type FilterFor<T> = {
  [P in keyof T & string]?: FilterValueFor<T[P]>;
};

export type FilterInput<T> = {
  filter?: FilterFor<T>;
  query?: string;
};
