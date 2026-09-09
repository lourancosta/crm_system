import { randomUUID } from "crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { snippet } from "../../db/schema";
import type { CreateSnippetInput, Snippet, UpdateSnippetInput } from "./snippet.types";

export async function findAll(): Promise<Snippet[]> {
  return db.select().from(snippet).orderBy(asc(snippet.name));
}

export async function findById(id: string): Promise<Snippet | null> {
  const rows = await db.select().from(snippet).where(eq(snippet.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateSnippetInput): Promise<Snippet> {
  const id = randomUUID();
  await db.insert(snippet).values({ id, ...input });
  const rows = await db.select().from(snippet).where(eq(snippet.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateSnippetInput): Promise<Snippet | null> {
  await db
    .update(snippet)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(snippet.id, id));
  const rows = await db.select().from(snippet).where(eq(snippet.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(snippet).where(eq(snippet.id, id));
  return result.affectedRows > 0;
}
