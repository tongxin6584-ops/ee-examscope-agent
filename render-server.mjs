import http from 'node:http';
import { createDifyStream } from './server/dify.js';

const port = Number(process.env.PORT || 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': frontendOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(Object.assign(new Error('请求体过大'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const controller = new AbortController();
  req.on('aborted', () => controller.abort());

  try {
    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const upstream = await createDifyStream(
      payload,
      process.env.DIFY_API_KEY,
      controller.signal,
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      sendJson(res, upstream.status, {
        error: 'Dify API 请求失败',
        detail: detail.slice(0, 500),
      });
      return;
    }

    res.writeHead(200, {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    sendJson(res, error.statusCode || 500, {
      error: error.message || '服务暂时不可用',
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ExamScope API listening on ${port}`);
});
