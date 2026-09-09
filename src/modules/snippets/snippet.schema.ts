import { z } from "zod";

export const snippetIdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const createSnippetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().default(""),
});

export const updateSnippetSchema = createSnippetSchema.partial();
