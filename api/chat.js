import { createDifyStream } from '../server/dify.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    const upstream = await createDifyStream(
      req.body,
      process.env.DIFY_API_KEY,
      controller.signal,
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(upstream.status).json({
        error: 'Dify API 请求失败',
        detail: detail.slice(0, 500),
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    if (!upstream.body) {
      res.end();
      return;
    }

    for await (const chunk of upstream.body) {
      res.write(Buffer.from(chunk));
    }
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(error.statusCode || 500).json({
      error: error.message || '服务暂时不可用',
    });
  }
}
