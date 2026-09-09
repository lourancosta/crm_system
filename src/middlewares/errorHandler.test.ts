import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler } from './errorHandler';
import { contactIdParamsSchema } from '../modules/contacts/contact.schema';

function createMockResponse() {
  return {
    body: undefined as unknown,
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function runErrorHandler(error: unknown) {
  const response = createMockResponse();
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    errorHandler(error as never, {} as never, response as never, (() => undefined) as never);
  } finally {
    console.error = originalConsoleError;
  }

  return response;
}

test('errorHandler returns 400 for Zod validation errors', () => {
  const result = contactIdParamsSchema.safeParse({ id: 'invalid-id' });
  assert.equal(result.success, false);

  const response = runErrorHandler(result.error);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: 'Validation failed',
    issues: [{ path: 'id', message: 'id must be a valid UUID' }],
  });
});

test('errorHandler returns 409 for duplicate email errors', () => {
  const sqlMessage = "Duplicate entry 'someone@example.com' for key 'contacts.contacts_email_unique'";
  const error = Object.assign(new Error(sqlMessage), {
    code: 'ER_DUP_ENTRY',
    sqlMessage,
  });

  const response = runErrorHandler(error);

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    message: 'A contact with this email already exists',
  });
});

test('errorHandler preserves explicit application status codes', () => {
  const error = Object.assign(new Error('Contact not found'), {
    statusCode: 404,
  });

  const response = runErrorHandler(error);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    message: 'Contact not found',
  });
});
