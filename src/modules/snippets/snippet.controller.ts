import type { NextFunction, Request, Response } from "express";
import * as service from "./snippet.service";
import { createSnippetSchema, snippetIdParamsSchema, updateSnippetSchema } from "./snippet.schema";

export async function listSnippets(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listSnippets());
  } catch (error) {
    next(error);
  }
}

export async function getSnippet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = snippetIdParamsSchema.parse(req.params);
    res.json(await service.getSnippet(id));
  } catch (error) {
    next(error);
  }
}

export async function createSnippet(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSnippetSchema.parse(req.body);
    res.status(201).json(await service.createSnippet(input));
  } catch (error) {
    next(error);
  }
}

export async function updateSnippet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = snippetIdParamsSchema.parse(req.params);
    const input = updateSnippetSchema.parse(req.body);
    res.json(await service.updateSnippet(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteSnippet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = snippetIdParamsSchema.parse(req.params);
    await service.deleteSnippet(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
