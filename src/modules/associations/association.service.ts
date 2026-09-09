import * as associationRepository from "./association.repository";
import { isAllowedAssociationPair, type AssociableType } from "../../lib/objectTypes";

export type AssociationInput = {
  sourceType: AssociableType;
  sourceId: string;
  targetType: AssociableType;
  targetId: string;
};

function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function assertValid(input: AssociationInput) {
  if (!isAllowedAssociationPair(input.sourceType, input.targetType)) {
    throw httpError(`Associations between ${input.sourceType} and ${input.targetType} are not supported`, 400);
  }
  if (input.sourceType === input.targetType && input.sourceId === input.targetId) {
    throw httpError("A record cannot be associated with itself", 400);
  }
}

async function resolveBothHubspotIds(input: AssociationInput) {
  const [sourceHubspotId, targetHubspotId] = await Promise.all([
    associationRepository.resolveHubspotId(input.sourceType, input.sourceId),
    associationRepository.resolveHubspotId(input.targetType, input.targetId),
  ]);
  if (!sourceHubspotId) throw httpError(`${input.sourceType} record not found`, 404);
  if (!targetHubspotId) throw httpError(`${input.targetType} record not found`, 404);
  return { sourceHubspotId, targetHubspotId };
}

// Idempotent: adding an association that already exists is a no-op success
// rather than a duplicate row or an error.
export async function createAssociation(input: AssociationInput): Promise<void> {
  assertValid(input);
  const { sourceHubspotId, targetHubspotId } = await resolveBothHubspotIds(input);
  const exists = await associationRepository.associationExists(input.sourceType, sourceHubspotId, input.targetType, targetHubspotId);
  if (exists) return;
  await associationRepository.createAssociation(input.sourceType, sourceHubspotId, input.targetType, targetHubspotId);
}

export async function removeAssociation(input: AssociationInput): Promise<void> {
  assertValid(input);
  const { sourceHubspotId, targetHubspotId } = await resolveBothHubspotIds(input);
  await associationRepository.removeAssociation(input.sourceType, sourceHubspotId, input.targetType, targetHubspotId);
}
