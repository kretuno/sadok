import assert from 'node:assert/strict';
import test from 'node:test';

import { getHelpArticleId } from '../src/help/contextHelp.ts';

test('getHelpArticleId maps application routes to the relevant Wiki article', () => {
  assert.equal(getHelpArticleId('/'), 'first-start');
  assert.equal(getHelpArticleId('/children'), 'children-attendance');
  assert.equal(getHelpArticleId('/attendance'), 'children-attendance');
  assert.equal(getHelpArticleId('/inventory'), 'menu-inventory');
  assert.equal(getHelpArticleId('/menu/day/42'), 'menu-inventory');
  assert.equal(getHelpArticleId('/medical'), 'medical-psychologist');
  assert.equal(getHelpArticleId('/settings'), 'settings-users');
  assert.equal(getHelpArticleId('/about'), 'troubleshooting-support');
});

test('getHelpArticleId hides contextual help inside the Wiki and on unknown routes', () => {
  assert.equal(getHelpArticleId('/documentation'), null);
  assert.equal(getHelpArticleId('/unknown'), null);
});
