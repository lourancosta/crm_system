import type { NextFunction, Request, Response } from "express";
import {
  columnNameParamsSchema,
  createGroupSchema,
  groupIdParamsSchema,
  listPropertiesQuerySchema,
  recordValuesQuerySchema,
  updateGroupSchema,
  updatePropertySchema,
  updateRecordValuesSchema,
} from "./objectProperties.schema";
import * as service from "./objectProperties.service";

export async function listProperties(req: Request, res: Response, next: NextFunction) {
  try {
    const { object } = listPropertiesQuerySchema.parse(req.query);
    res.json(await service.listProperties(object));
  } catch (error) {
    next(error);
  }
}

export async function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const { object } = listPropertiesQuerySchema.parse(req.query);
    res.json(await service.listGroups(object));
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { object, label } = createGroupSchema.parse(req.body);
    res.status(201).json(await service.createGroup(object, label));
  } catch (error) {
    next(error);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = groupIdParamsSchema.parse(req.params);
    const { label } = updateGroupSchema.parse(req.body);
    res.json(await service.updateGroup(id, label));
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = groupIdParamsSchema.parse(req.params);
    await service.deleteGroup(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function updateProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const { columnName } = columnNameParamsSchema.parse(req.params);
    const { object, label, groupId } = updatePropertySchema.parse(req.body);
    await service.updateProperty(object, columnName, { label, groupId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getRecordValues(req: Request, res: Response, next: NextFunction) {
  try {
    const { object, id } = recordValuesQuerySchema.parse(req.query);
    res.json(await service.getRecordValues(object, id));
  } catch (error) {
    next(error);
  }
}

export async function updateRecordValues(req: Request, res: Response, next: NextFunction) {
  try {
    const { object, id, values } = updateRecordValuesSchema.parse(req.body);
    await service.updateRecordValues(object, id, values);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
