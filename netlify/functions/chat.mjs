import { createDifyStream } from '../../server/dify.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const upstream = await createDifyStream(payload, process.env.DIFY_API_KEY);

    if (!upstream.ok) {
      const detail = await upstream.text();
      return {
        statusCode: upstream.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          error: 'Dify API 请求失败',
          detail: detail.slice(0, 500),
        }),
      };
    }

    const chunks = [];
    if (upstream.body) {
      for await (const chunk of upstream.body) chunks.push(Buffer.from(chunk));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
      body: Buffer.concat(chunks).toString('utf8'),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: error.message || '服务暂时不可用' }),
    };
  }
};
