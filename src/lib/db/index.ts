import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { migrations, schema } from "./schema";
import { seed } from "./seed";
export { nowIso, daysAgo, daysFromNow } from "../dates";

// One SQLite database for the whole app, opened on first use. DATA_DIR
// chooses the directory (default ./data); ":memory:" gives a private
// in-memory database, which the tests use.

const globalForDb = globalThis as unknown as { __meridianDb?: DatabaseSync };

export function openDatabase(location: string): DatabaseSync {
  const db = new DatabaseSync(location);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(schema);
  const row = db.prepare("SELECT MAX(version) AS v FROM schema_version").get() as { v: number | null };
  const current = row.v ?? 0;
  for (let i = current; i < migrations.length; i++) {
    db.exec(migrations[i]);
    db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(i + 1);
  }
  if (current === 0 && migrations.length === 0) {
    db.prepare("INSERT OR IGNORE INTO schema_version (version) VALUES (0)").run();
  }
  const count = db.prepare("SELECT COUNT(*) AS n FROM staff").get() as { n: number };
  if (count.n === 0) seed(db);
  return db;
}

export function databasePath(): string {
  const dir = process.env.DATA_DIR;
  if (dir === ":memory:") return dir;
  // Default ./data next to the app; DATA_DIR overrides (an absolute path in
  // the container). The ignore comment keeps the bundler from tracing the
  // whole filesystem because of the dynamic path.
  const abs = dir ? path.resolve(/* turbopackIgnore: true */ dir) : path.join(process.cwd(), "data");
  mkdirSync(abs, { recursive: true });
  return path.join(abs, "meridian.db");
}

export function db(): DatabaseSync {
  if (!globalForDb.__meridianDb) {
    globalForDb.__meridianDb = openDatabase(databasePath());
  }
  return globalForDb.__meridianDb;
}

/** Drops every row and reseeds. Used by Settings → Reset demo data. */
export function resetDatabase(): void {
  const d = db();
  d.exec(`
    DELETE FROM activity; DELETE FROM expenses; DELETE FROM invoices;
    DELETE FROM order_lines; DELETE FROM orders; DELETE FROM customer_notes;
    DELETE FROM products; DELETE FROM customers; DELETE FROM staff;
  `);
  seed(d);
}

// node:sqlite returns rows without a prototype, which React refuses to pass
// to client components. q() prepares a statement whose all()/get() return
// plain objects; use it for every read that may reach the UI.
export function q(sql: string) {
  const stmt = db().prepare(sql);
  return {
    all: (...args: SQLInputValue[]) => stmt.all(...args).map((r) => ({ ...r })),
    get: (...args: SQLInputValue[]) => {
      const r = stmt.get(...args);
      return r ? { ...r } : undefined;
    },
    run: (...args: SQLInputValue[]) => stmt.run(...args),
  };
}
