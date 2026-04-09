import { Database } from "@lobomfz/db";
import { type } from "arktype";
import { createFilter } from "../src/index.js";

const schema = type({
  amount: "number",
});

export const filter = createFilter(schema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const multiSchema = type({
  amount: "number",
  price: "number",
});

export const multiFilter = createFilter(multiSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const stringSchema = type({
  name: "string",
});

export const stringFilter = createFilter(stringSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const mixedSchema = type({
  amount: "number",
  name: "string",
});

export const searchFilter = createFilter(mixedSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
  queryBy: ["name"],
});

const searchableSchema = type({
  name: "string",
  description: "string",
});

export const multiSearchFilter = createFilter(searchableSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
  queryBy: ["name", "description"],
});

const dateSchema = type({
  due_on: "Date",
});

export const dateFilter = createFilter(dateSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const boolSchema = type({
  active: "boolean",
});

export const boolFilter = createFilter(boolSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const enumSchema = type({
  status: "'pending' | 'paid' | 'overdue'",
});

export const enumFilter = createFilter(enumSchema, {
  dialect: "sqlite",
  timezone: "America/Sao_Paulo",
});

const tableSchema = type({
  id: "number",
  amount: "number",
  price: "number",
  name: "string",
  description: "string",
  due_on: "string",
  active: "number",
  status: "string",
});

export const database = new Database({
  path: ":memory:",
  schema: { tables: { items: tableSchema } },
});

export const db = database.kysely;

export async function seed() {
  return await db
    .insertInto("items")
    .values([
      {
        id: 1,
        amount: 10,
        price: 5,
        name: "Widget",
        description: "A small widget",
        due_on: "2024-01-15",
        active: 1,
        status: "pending",
      },
      {
        id: 2,
        amount: 50,
        price: 25,
        name: "Gadget",
        description: "A cool gadget",
        due_on: "2024-06-01",
        active: 1,
        status: "paid",
      },
      {
        id: 3,
        amount: 100,
        price: 75,
        name: "Widget Pro",
        description: "A premium widget",
        due_on: "2024-12-25",
        active: 0,
        status: "overdue",
      },
      {
        id: 4,
        amount: 100,
        price: 150,
        name: "Doohickey",
        description: "A mysterious item",
        due_on: "2025-03-10",
        active: 0,
        status: "pending",
      },
    ])
    .execute();
}
