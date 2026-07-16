import assert from 'node:assert/strict';
import test from 'node:test';

import { searchHelpArticles, type HelpArticle } from '../src/help/helpSearch.ts';

const articles: HelpArticle[] = [
  {
    id: 'backups',
    title: 'Резервне копіювання',
    description: 'Створення та відновлення резервних копій',
    keywords: ['база', 'архів', 'відновлення'],
    content: 'Відкрийте Налаштування та створіть нову резервну копію.',
  },
  {
    id: 'attendance',
    title: 'Облік відвідування',
    description: 'Щоденне відмічання присутності дітей',
    keywords: ['діти', 'група'],
    content: 'Оберіть дату та позначте присутніх дітей.',
  },
];

test('searchHelpArticles finds articles by title, keyword and content', () => {
  assert.deepEqual(searchHelpArticles(articles, 'копіювання').map((article) => article.id), ['backups']);
  assert.deepEqual(searchHelpArticles(articles, 'АРХІВ').map((article) => article.id), ['backups']);
  assert.deepEqual(searchHelpArticles(articles, 'присутніх').map((article) => article.id), ['attendance']);
});

test('searchHelpArticles returns all articles for an empty query', () => {
  assert.deepEqual(searchHelpArticles(articles, '   '), articles);
});

test('searchHelpArticles requires every query word to match', () => {
  assert.deepEqual(searchHelpArticles(articles, 'діти присутність').map((article) => article.id), ['attendance']);
  assert.deepEqual(searchHelpArticles(articles, 'діти архів'), []);
});
