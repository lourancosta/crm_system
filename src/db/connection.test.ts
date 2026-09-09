import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseConnectionString, getReaderConnectionString } from './connection';

test('getDatabaseConnectionString builds a URL from DB_* variables', () => {
  const connectionString = getDatabaseConnectionString({
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'db-admin',
    DB_PASSWORD: 'p@ss#word',
    DB_DATABASE: 'crm',
  });

  assert.equal(
    connectionString,
    'mysql://db-admin:p%40ss%23word@localhost:3306/crm',
  );
});

test('getDatabaseConnectionString prefers DB_* variables over DATABASE_URL', () => {
  const connectionString = getDatabaseConnectionString({
    DATABASE_URL: 'mysql://broken-url',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'db-admin',
    DB_PASSWORD: 'safe-password',
    DB_DATABASE: 'crm',
  });

  assert.equal(
    connectionString,
    'mysql://db-admin:safe-password@localhost:3306/crm',
  );
});

test('getDatabaseConnectionString falls back to DATABASE_URL when DB_* variables are absent', () => {
  const connectionString = getDatabaseConnectionString({
    DATABASE_URL: 'mysql://root:password@localhost:3306/crm',
  });

  assert.equal(connectionString, 'mysql://root:password@localhost:3306/crm');
});

test('getReaderConnectionString uses DB_HOST_READ when set', () => {
  const connectionString = getReaderConnectionString({
    DB_HOST: 'mysql-writer.internal',
    DB_HOST_READ: 'mysql-reader.internal',
    DB_PORT: '3306',
    DB_USERNAME: 'db-admin',
    DB_PASSWORD: 'p@ss#word',
    DB_DATABASE: 'crm',
  });

  assert.equal(
    connectionString,
    'mysql://db-admin:p%40ss%23word@mysql-reader.internal:3306/crm',
  );
});

test('getReaderConnectionString falls back to DB_HOST when DB_HOST_READ is absent', () => {
  const connectionString = getReaderConnectionString({
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'db-admin',
    DB_PASSWORD: 'safe-password',
    DB_DATABASE: 'crm',
  });

  assert.equal(
    connectionString,
    'mysql://db-admin:safe-password@localhost:3306/crm',
  );
});

test('getReaderConnectionString falls back to DATABASE_URL when DB_* variables are absent', () => {
  const connectionString = getReaderConnectionString({
    DATABASE_URL: 'mysql://root:password@localhost:3306/crm',
  });

  assert.equal(connectionString, 'mysql://root:password@localhost:3306/crm');
});
