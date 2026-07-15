import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeActivatorApiUrl } from '../src/services/activatorConfig';

test('activator URL accepts HTTPS and strips trailing slashes', () => {
  assert.equal(
    normalizeActivatorApiUrl('https://activator.example.com///'),
    'https://activator.example.com'
  );
});

test('activator URL permits HTTP only for loopback development hosts', () => {
  assert.equal(normalizeActivatorApiUrl('http://127.0.0.1:8787/'), 'http://127.0.0.1:8787');
  assert.equal(normalizeActivatorApiUrl('http://localhost:8787'), 'http://localhost:8787');
  assert.throws(
    () => normalizeActivatorApiUrl('http://activator.example.com'),
    /HTTPS/
  );
});

test('activator URL rejects malformed and unsupported endpoints', () => {
  assert.equal(normalizeActivatorApiUrl(undefined), '');
  assert.throws(() => normalizeActivatorApiUrl('not-a-url'), /URL/);
  assert.throws(() => normalizeActivatorApiUrl('ftp://activator.example.com'), /HTTPS/);
});
