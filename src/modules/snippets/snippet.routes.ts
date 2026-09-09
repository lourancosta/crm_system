import { Router } from "express";
import { createSnippet, deleteSnippet, getSnippet, listSnippets, updateSnippet } from "./snippet.controller";

export const snippetRoutes = Router();

snippetRoutes.get("/", listSnippets);
snippetRoutes.post("/", createSnippet);
snippetRoutes.get("/:id", getSnippet);
snippetRoutes.put("/:id", updateSnippet);
snippetRoutes.delete("/:id", deleteSnippet);
