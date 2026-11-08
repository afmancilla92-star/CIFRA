import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA, SCHEMA_VERSION } from "./schema";

type Row = Record<string, unknown>;

let client: Client | null = null;
let ready: Promise<void> | null = null;

function resolveUrl(): string {
  const url = process.env.DATABASE_URL || "file:./data/radar.db";
  if (url.startsWith("file:")) {
    const file = url.slice("file:".length);
    if (file !== ":memory:") mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  return url;
}

async function migrate(c: Client) {
  for (const stmt of SCHEMA) await c.execute(stmt);
  await c.execute({
    sql: "INSERT INTO meta(key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [String(SCHEMA_VERSION)],
  });
}

/** Cliente único por proceso; aplica el esquema la primera vez. */
export async function db(): Promise<Client> {
  if (!client) {
    client = createClient({ url: resolveUrl(), authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
    ready = migrate(client);
  }
  await ready;
  return client;
}

/** Solo para tests: reemplaza el cliente (p. ej. por una base temporal). */
export async function resetDbForTests(url: string) {
  if (client) client.close();
  client = createClient({ url });
  ready = migrate(client);
  await ready;
  return client;
}

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await db()).execute({ sql, args });
  return res.rows.map((r) => ({ ...r }) as T);
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

export function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
