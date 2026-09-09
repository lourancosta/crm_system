import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError } from 'zod';
import { contactIdParamsSchema } from './contact.schema';

test('contactIdParamsSchema accepts a valid UUID', () => {
  const params = contactIdParamsSchema.parse({
    id: '550e8400-e29b-41d4-a716-446655440000',
  });

  assert.equal(params.id, '550e8400-e29b-41d4-a716-446655440000');
});

test('contactIdParamsSchema rejects an invalid UUID', () => {
  assert.throws(
    () => contactIdParamsSchema.parse({ id: 'not-a-uuid' }),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.equal(error.issues[0]?.message, 'id must be a valid UUID');
      return true;
    },
  );
});
