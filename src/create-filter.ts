import { type } from "arktype";
import dayjs from "dayjs";
import {
  expressionBuilder,
  sql,
  type ExpressionBuilder,
  type OperandExpression,
  type SqlBool,
} from "kysely";
import {
  isRelativeDate,
  resolveRelativeDate,
  type ColumnType,
  type FilterDescriptor,
} from "./filters/index.js";
import type { FilterInput } from "./types.js";

export type CreateFilterOptions = {
  dialect: "postgres" | "sqlite";
  timezone: string;
  queryBy?: string[];
};

type Filter<T> = {
  describe: () => FilterDescriptor<T>;
  schema: type<FilterInput<T>>;
  where: (input: FilterInput<T>) => OperandExpression<SqlBool>;
};

const COLUMN_TYPE_MAP: Record<string, ColumnType> = {
  number: "number",
  string: "string",
  boolean: "boolean",
  Date: "date",
};

const OPERATOR_TO_KYSELY: Record<string, string> = {
  not: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  notIn: "not in",
};

const numberOperatorsType = type({
  "not?": "number",
  "gt?": "number",
  "gte?": "number",
  "lt?": "number",
  "lte?": "number",
});

const stringOperatorsType = type({
  "not?": "string",
});

const relativeDateUnit = type.enumerated("day", "week", "month");

const relativeDateArk = type({ startOf: relativeDateUnit }).or(
  type({ endOf: relativeDateUnit }),
);

const dateValueArk = type("string").or(relativeDateArk);

const dateOperatorsType = type({
  "not?": dateValueArk,
  "gt?": dateValueArk,
  "gte?": dateValueArk,
  "lt?": dateValueArk,
  "lte?": dateValueArk,
});

const FILTER_VALUE_TYPE: Record<string, type> = {
  number: type("number").or(numberOperatorsType),
  string: type("string").or(stringOperatorsType),
  boolean: type("boolean"),
  date: type("string").or(relativeDateArk).or(dateOperatorsType),
};

function toDateBindValue(value: unknown, timezone: string) {
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);

    return match ? match[0] : value;
  }

  if (value instanceof Date) {
    return dayjs(value).tz(timezone).format("YYYY-MM-DD");
  }

  return value;
}

function toWhereValue(
  columnType: ColumnType,
  value: unknown,
  timezone: string,
): unknown {
  if (columnType !== "date") {
    return value;
  }

  if (isRelativeDate(value)) {
    return toDateBindValue(resolveRelativeDate(value, timezone), timezone);
  }

  return toDateBindValue(value, timezone);
}

function escapeLikePattern(query: string) {
  return query
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function createSearchCondition(
  field: string,
  likeOp: string,
  pattern: string,
): OperandExpression<SqlBool> {
  return sql<SqlBool>`${sql.ref(field)} ${sql.raw(likeOp)} ${pattern} escape '\\'`;
}

const CONDITIONS_BY_TYPE: Record<string, { key: string; label: string }[]> = {
  number: [
    { key: "equals", label: "equals" },
    { key: "not_equals", label: "not equals" },
    { key: "gt", label: "greater than" },
    { key: "gte", label: "greater than or equal" },
    { key: "lt", label: "less than" },
    { key: "lte", label: "less than or equal" },
    { key: "between", label: "between" },
  ],
  string: [
    { key: "equals", label: "equals" },
    { key: "not_equals", label: "not equals" },
  ],
  boolean: [{ key: "equals", label: "equals" }],
  date: [
    { key: "equals", label: "equals" },
    { key: "not_equals", label: "not equals" },
    { key: "gt", label: "greater than" },
    { key: "lt", label: "less than" },
    { key: "between", label: "between" },
  ],
  enum: [
    { key: "is_in", label: "is in" },
    { key: "is_not_in", label: "is not in" },
  ],
};

export function createFilter<T>(
  schema: type<T>,
  options: CreateFilterOptions,
): Filter<T> {
  const props = (schema as any).internal.structure.props as {
    key: string;
    value: {
      expression: string;
      internal?: { branches?: { expression: string }[] };
    };
  }[];

  const columns = props.map((p) => {
      let colType: ColumnType;
      let values: string[] | undefined;

      const mapped = COLUMN_TYPE_MAP[p.value.expression];

      if (mapped) {
        colType = mapped;
      } else {
        const branches = p.value.internal?.branches;

        if (
          branches &&
          branches.every(
            (b) => b.expression.startsWith('"') && b.expression.endsWith('"'),
          )
        ) {
          colType = "enum";
          values = branches.map((b) => b.expression.slice(1, -1));
        } else {
          throw new Error(`Unsupported type: ${p.value.expression}`);
        }
      }

      const conditions = CONDITIONS_BY_TYPE[colType]!;

      return {
        key: p.key as keyof T & string,
        type: colType,
        conditions,
        ...(values ? { values } : {}),
      };
    });

  const filterDef: Record<string, any> = {};

  for (const col of columns) {
    if (col.type === "enum" && col.values) {
      const enumType = type.enumerated(...(col.values as [string, ...string[]]));
      const enumNotInType = type({ "notIn?": enumType.array() });

      filterDef[`${col.key}?`] = enumType.or(enumType.array()).or(enumNotInType);
      continue;
    }

    const valueType = FILTER_VALUE_TYPE[col.type];

    if (!valueType) {
      throw new Error(`No filter value type for: ${col.type}`);
    }

    filterDef[`${col.key}?`] = valueType;
  }

  const inputSchema = type({
    "filter?": type(filterDef),
    "query?": "string",
  });

  function describe(): FilterDescriptor<T> {
    return { columns };
  }

  function where(
    input: FilterInput<T>,
  ): OperandExpression<SqlBool> {
      const builder = expressionBuilder() as ExpressionBuilder<any, any>;
      const conditions: OperandExpression<SqlBool>[] = [];

    if (input.filter) {
      for (const col of columns) {
        const value = (input.filter as Record<string, unknown>)[col.key];

        if (value === undefined) {
          continue;
        }

        if (Array.isArray(value)) {
          conditions.push(builder(col.key, "in", value as any));
          continue;
        }

        if (col.type === "date" && isRelativeDate(value)) {
          conditions.push(
            builder(
              col.key,
              "=",
              toWhereValue(col.type, value, options.timezone) as any,
            ),
          );
          continue;
        }

        if (typeof value !== "object" || value === null) {
          conditions.push(
            builder(
              col.key,
              "=",
              toWhereValue(col.type, value, options.timezone) as any,
            ),
          );
          continue;
        }

        for (const [opKey, opValue] of Object.entries(value)) {
          const kyselyOp = OPERATOR_TO_KYSELY[opKey];

          if (!kyselyOp) {
            continue;
          }

          conditions.push(
            builder(
              col.key,
              kyselyOp as any,
              toWhereValue(col.type, opValue, options.timezone) as any,
            ),
          );
        }
      }
    }

    if (input.query && options.queryBy && options.queryBy.length > 0) {
      const likeOp = options.dialect === "postgres" ? "ilike" : "like";
      const pattern = `%${escapeLikePattern(input.query)}%`;

      if (options.queryBy.length === 1) {
        conditions.push(createSearchCondition(options.queryBy[0]!, likeOp, pattern));
      } else {
        const searchConditions = options.queryBy.map((field) =>
          createSearchCondition(field, likeOp, pattern),
        );

        conditions.push(builder.or(searchConditions) as OperandExpression<SqlBool>);
      }
    }

    if (conditions.length === 0) {
      return sql<SqlBool>`1 = 1`;
    }

    if (conditions.length === 1) {
      return conditions[0]!;
    }

    return builder.and(conditions) as OperandExpression<SqlBool>;
  }

  return {
    describe,
    schema: inputSchema as type<FilterInput<T>>,
    where,
  };
}
