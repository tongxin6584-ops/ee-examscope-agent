import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeSseStream, parseSseBlock } from '../src/lib/sse.js';

test('parses a Dify SSE event', () => {
  assert.deepEqual(
    parseSseBlock('event: message\ndata: {"event":"message","answer":"你好"}'),
    { event: 'message', answer: '你好' },
  );
});

test('reads events split across arbitrary byte chunks', async () => {
  const source = [
    'data: {"event":"message","answer":"你好","conversation_id":"conv-1"}\r\n\r\n',
    'data: {"event":"message_end","conversation_id":"conv-1"}\r\n\r\n',
  ].join('');
  const bytes = new TextEncoder().encode(source);
  const cuts = [bytes.slice(0, 19), bytes.slice(19, 47), bytes.slice(47)];
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of cuts) controller.enqueue(chunk);
      controller.close();
    },
  });
  const events = [];

  await consumeSseStream(stream, (event) => events.push(event));

  assert.equal(events.length, 2);
  assert.equal(events[0].answer, '你好');
  assert.equal(events[1].conversation_id, 'conv-1');
});

test('ignores SSE comments and the DONE sentinel', () => {
  assert.equal(parseSseBlock(': ping'), null);
  assert.equal(parseSseBlock('data: [DONE]'), null);
});
