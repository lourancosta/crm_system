import type { NextFunction, Request, Response } from "express";
import * as associationService from "./association.service";
import { resolveModuleGrant } from "../../middlewares/authorize";
import { OBJECT_TYPES, type AssociableType } from "../../lib/objectTypes";
import { createAssociationSchema, removeAssociationParamsSchema } from "./association.schema";

function forbidden(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 403;
  return error;
}

// The module to gate on is only known after the request body/params are
// parsed (it depends on sourceType), so this can't be a static
// requireModule(...) route middleware like every other module uses — the
// check happens here instead, reusing the same resolveModuleGrant() the
// middleware itself calls. Only the source side's `edit` permission is
// checked, matching the existing convention that association read routes
// (e.g. partnership.routes.ts's GET /:id/companies) only gate on the owning
// record's module too.
async function assertEditPermission(req: Request, sourceType: AssociableType) {
  const moduleName = OBJECT_TYPES[sourceType].module;
  const { permission } = await resolveModuleGrant(req, moduleName);
  if (permission.edit === "none") throw forbidden(`Not permitted to edit ${moduleName}`);
}

export async function createAssociation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAssociationSchema.parse(req.body);
    await assertEditPermission(req, input.sourceType);
    await associationService.createAssociation(input);
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function removeAssociation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = removeAssociationParamsSchema.parse(req.params);
    await assertEditPermission(req, input.sourceType);
    await associationService.removeAssociation(input);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
