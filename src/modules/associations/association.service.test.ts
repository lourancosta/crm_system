import assert from "node:assert/strict";
import test from "node:test";
import { createAssociation, removeAssociation } from "./association.service";
import { isAllowedAssociationPair } from "../../lib/objectTypes";

function statusOf(err: unknown): number | undefined {
  return err instanceof Error ? (err as Error & { statusCode?: number }).statusCode : undefined;
}

test("isAllowedAssociationPair accepts an editable edge in either order", () => {
  assert.equal(isAllowedAssociationPair("contacts", "companies"), true);
  assert.equal(isAllowedAssociationPair("companies", "contacts"), true);
});

test("isAllowedAssociationPair rejects a pair with no editable edge", () => {
  // Invoices are only editable via their deal association — companies and
  // contacts (and everything else) stay read-only.
  assert.equal(isAllowedAssociationPair("invoices", "companies"), false);
  assert.equal(isAllowedAssociationPair("invoices", "contacts"), false);
  assert.equal(isAllowedAssociationPair("invoices", "tickets"), false);
});

test("isAllowedAssociationPair allows the self-referential companies edge", () => {
  assert.equal(isAllowedAssociationPair("companies", "companies"), true);
});

test("createAssociation rejects a pair outside the allow-list before touching the database", async () => {
  await assert.rejects(
    () =>
      createAssociation({
        sourceType: "invoices",
        sourceId: "00000000-0000-0000-0000-000000000001",
        targetType: "companies",
        targetId: "00000000-0000-0000-0000-000000000002",
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(statusOf(error), 400);
      assert.match(error.message, /not supported/);
      return true;
    },
  );
});

test("createAssociation rejects associating a record with itself", async () => {
  const id = "00000000-0000-0000-0000-000000000003";
  await assert.rejects(
    () => createAssociation({ sourceType: "companies", sourceId: id, targetType: "companies", targetId: id }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(statusOf(error), 400);
      assert.match(error.message, /cannot be associated with itself/);
      return true;
    },
  );
});

test("removeAssociation rejects a pair outside the allow-list before touching the database", async () => {
  await assert.rejects(
    () =>
      removeAssociation({
        sourceType: "invoices",
        sourceId: "00000000-0000-0000-0000-000000000004",
        targetType: "contacts",
        targetId: "00000000-0000-0000-0000-000000000005",
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(statusOf(error), 400);
      return true;
    },
  );
});
