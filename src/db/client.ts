import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { getDatabaseConnectionString, getReaderConnectionString } from './connection';

export const writerPool = mysql.createPool(getDatabaseConnectionString());
export const readerPool = mysql.createPool(getReaderConnectionString());

// `db` is unchanged (still the writer) — every existing repository keeps
// working exactly as before. Tried wrapping this in drizzle-orm's own
// withReplicas() helper for automatic read routing, but its generic
// signature is too complex for this schema (contacts/tickets are 600+
// columns) and blows TypeScript's instantiation-depth limit across ~30
// repository files — the same class of wall src/db/lightTables.ts's header
// comment already documents. `readerDb` is exposed as a plain second
// instance for call sites that explicitly want reader-routed reads; nothing
// currently uses it — wiring specific read-heavy call sites onto it is a
// deliberate follow-up, not something this change silently does app-wide.
export const db = drizzle(writerPool, { schema, mode: 'default' });
export const readerDb = drizzle(readerPool, { schema, mode: 'default' });
