import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSupportRequest } from '../src/services/supportRequest.ts';

test('normalizeSupportRequest trims fields and adds technical metadata', () => {
  assert.deepEqual(normalizeSupportRequest({
    category: 'suggestion',
    subject: '  Покращення друку  ',
    message: '  Додайте вибір формату сторінки.  ',
    contact: ' user@example.com ',
  }, {
    appVersion: '1.1.3',
    platform: 'win32 10.0.26100 x64',
  }), {
    category: 'suggestion',
    subject: 'Покращення друку',
    message: 'Додайте вибір формату сторінки.',
    contact: 'user@example.com',
    appVersion: '1.1.3',
    platform: 'win32 10.0.26100 x64',
  });
});

test('normalizeSupportRequest rejects incomplete requests', () => {
  assert.throws(() => normalizeSupportRequest({
    category: 'bug',
    subject: 'Помилка',
    message: 'short',
    contact: '',
  }, {
    appVersion: '1.1.3',
    platform: 'win32',
  }), /опис/i);
});
