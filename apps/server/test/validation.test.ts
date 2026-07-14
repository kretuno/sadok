import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import {
  validateCreateUserInput,
  validateLoginInput,
  validateNumericId,
  validateUpdateUserInput,
} from '../src/middleware/validation';

const runMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  request: Partial<Request>
) => {
  let statusCode = 200;
  let payload: unknown;
  let nextCalled = false;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      payload = value;
      return this;
    },
  } as Response;

  middleware(request as Request, response, () => {
    nextCalled = true;
  });

  return { statusCode, payload, nextCalled };
};

test('login validation trims valid usernames', () => {
  const request = { body: { username: '  admin  ', password: 'admin123' } };
  const result = runMiddleware(validateLoginInput, request);

  assert.equal(result.nextCalled, true);
  assert.equal(request.body.username, 'admin');
});

test('login validation rejects malformed input', () => {
  const result = runMiddleware(validateLoginInput, {
    body: { username: 'bad name', password: '' },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.ok(result.payload);
});

test('creating a user requires a strong password and username', () => {
  const baseBody = {
    fullName: 'Test User',
    role: 'user',
    permissions: { version: 2, modules: {} },
  };

  const missingUsername = runMiddleware(validateCreateUserInput, {
    body: { ...baseBody, password: 'password123' },
  });
  const weakPassword = runMiddleware(validateCreateUserInput, {
    body: { ...baseBody, username: 'tester', password: 'short' },
  });

  assert.equal(missingUsername.statusCode, 400);
  assert.equal(weakPassword.statusCode, 400);
});

test('updating a user requires a boolean active status', () => {
  const result = runMiddleware(validateUpdateUserInput, {
    body: {
      fullName: 'Test User',
      role: 'user',
      permissions: { version: 2, modules: {} },
    },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
});

test('numeric id validation accepts only positive safe integers', () => {
  const valid = runMiddleware(validateNumericId, { params: { id: '42' } });
  const invalid = runMiddleware(validateNumericId, { params: { id: '../1' } });

  assert.equal(valid.nextCalled, true);
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.statusCode, 400);
});
