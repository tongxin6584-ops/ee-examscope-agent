import assert from 'node:assert/strict';
import test from 'node:test';
import { createDifyStream } from '../server/dify.js';

test('rejects a missing server-side API key', async () => {
  await assert.rejects(
    createDifyStream({ query: 'test' }, ''),
    (error) => error.statusCode === 500 && /DIFY_API_KEY/.test(error.message),
  );
});

test('rejects an empty query', async () => {
  await assert.rejects(
    createDifyStream({ query: '   ' }, 'test-key'),
    (error) => error.statusCode === 400,
  );
});

test('rejects a query over the client limit', async () => {
  await assert.rejects(
    createDifyStream({ query: 'x'.repeat(4001) }, 'test-key'),
    (error) => error.statusCode === 400 && /4000/.test(error.message),
  );
});
