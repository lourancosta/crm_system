import { sql, type Column, type SQL, type SQLWrapper } from "drizzle-orm";

// Drop-in replacement for drizzle-orm's `ilike()` — that one hardcodes the
// literal `ilike` SQL keyword regardless of dialect, which doesn't exist in
// MySQL (throws ER_PARSE_ERROR at query time; no compile-time signal since
// it's inside a template-generated SQL string). Column collation in MySQL is
// often already case-insensitive, but not guaranteed, so this wraps both
// sides in LOWER() to match Postgres's ILIKE semantics exactly regardless of
// collation. Same signature as the drizzle-orm `ilike` it replaces, so every
// call site is unchanged — only the import needs to point here.
export function ilike(column: Column | SQL.Aliased | SQL, value: string | SQLWrapper): SQL {
  return sql`LOWER(${column}) LIKE LOWER(${value})`;
}
