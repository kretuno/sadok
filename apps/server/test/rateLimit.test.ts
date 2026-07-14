import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { createRateLimit } from '../src/middleware/rateLimit';

const invoke = (
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  ip: string
) => {
  let statusCode = 200;
  let nextCalled = false;
  const headers = new Map<string, string>();
  const request = { ip, socket: { remoteAddress: ip } } as Request;
  const response = {
    setHeader(name: string, value: number | string) {
      headers.set(name, String(value));
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as Response;

  middleware(request, response, () => {
    nextCalled = true;
  });

  return { statusCode, nextCalled, headers };
};

test('rate limit blocks only after the configured number of requests', () => {
  const middleware = createRateLimit({
    windowMs: 60_000,
    max: 2,
    message: 'Too many requests',
  });

  const first = invoke(middleware, '127.0.0.1');
  const second = invoke(middleware, '127.0.0.1');
  const third = invoke(middleware, '127.0.0.1');
  const otherClient = invoke(middleware, '127.0.0.2');

  assert.equal(first.nextCalled, true);
  assert.equal(second.nextCalled, true);
  assert.equal(second.headers.get('RateLimit-Remaining'), '0');
  assert.equal(third.nextCalled, false);
  assert.equal(third.statusCode, 429);
  assert.ok(third.headers.has('Retry-After'));
  assert.equal(otherClient.nextCalled, true);
});
