# @lobomfz/filters

Headless, Kysely-native filter system powered by [Arktype](https://arktype.io/).

Define your schema once. Get type-safe filtering, Kysely predicates, input validation, and a headless state machine — all from the same source of truth. No external search engine required.

```bash
bun add @lobomfz/filters arktype kysely
```

## Define filters

```typescript
import { type } from "arktype";
import { createFilter } from "@lobomfz/filters";

const filter = createFilter(
  type({
    name: "string",
    amount: "number",
    status: "'pending' | 'paid' | 'overdue'",
    due_on: "Date",
  }),
  { dialect: "postgres", timezone: "America/Sao_Paulo" },
);
```

## Query with Kysely

`.where(input)` returns a Kysely-compatible callback. Plug it directly into any query chain.

```typescript
const rows = await db
  .selectFrom("invoices")
  .selectAll()
  .where(
    filter.where({
      query: "acme",
      filter: {
        amount: { gte: 1000 },
        status: ["pending", "overdue"],
        due_on: { lte: { endOf: "month" } },
      },
      page: 1,
      limit: 20,
    }),
  )
  .execute();
```

## Validate input

`.schema` returns an Arktype `Type` for the full input shape — use it directly as an API validator.

```typescript
const input = filter.schema.assert(rawInput);
```

## Describe for the frontend

`.describe()` returns a structural descriptor with field types, available conditions, and enum values. No labels — the frontend owns presentation.

```typescript
const descriptor = filter.describe();
// { columns: [{ key: 'amount', type: 'number', conditions: ['equals', 'not_equals', 'gt', ...] }, ...] }
```

## React hook

`useFilterBuilder` wraps a headless state machine in React state. No components — just data and actions.

```tsx
import { useFilterBuilder } from "@lobomfz/filters/react";

const { rows, result, add, remove, setField, setCondition, setValue, clear, restore } =
  useFilterBuilder(descriptor);
```

## Relative dates

Date fields accept relative values that resolve at query time with timezone awareness.

```typescript
import { type RelativeDate } from "@lobomfz/filters";

// "this month"
const thisMonth = {
  due_on: {
    gte: { startOf: "month" },
    lte: { endOf: "month" },
  },
};

// "today"
const today = {
  due_on: { startOf: "day" },
};
```

## Operators

| Field type | Conditions                                          |
| ---------- | --------------------------------------------------- |
| `string`   | `equals`, `not_equals`                              |
| `number`   | `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `between` |
| `date`     | `equals`, `not_equals`, `gt`, `lt`, `between`       |
| `enum`     | `is_in`, `is_not_in`                                |
| `boolean`  | `equals`                                            |
