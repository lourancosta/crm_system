import { Router } from "express";
import {
  createGroup,
  deleteGroup,
  getRecordValues,
  listGroups,
  listProperties,
  updateGroup,
  updateProperty,
  updateRecordValues,
} from "./objectProperties.controller";

export const objectPropertiesRoutes = Router();

objectPropertiesRoutes.get("/", listProperties);
objectPropertiesRoutes.get("/groups", listGroups);
objectPropertiesRoutes.get("/record", getRecordValues);
objectPropertiesRoutes.post("/groups", createGroup);
objectPropertiesRoutes.put("/groups/:id", updateGroup);
objectPropertiesRoutes.delete("/groups/:id", deleteGroup);
// Must come before the /:columnName wildcard below — otherwise PUT /record
// would incorrectly match that route with columnName="record".
objectPropertiesRoutes.put("/record", updateRecordValues);
objectPropertiesRoutes.put("/:columnName", updateProperty);
