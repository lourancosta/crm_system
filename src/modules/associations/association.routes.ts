import { Router } from "express";
import { createAssociation, removeAssociation } from "./association.controller";

export const associationRoutes = Router();

associationRoutes.post("/", createAssociation);
associationRoutes.delete("/:sourceType/:sourceId/:targetType/:targetId", removeAssociation);
