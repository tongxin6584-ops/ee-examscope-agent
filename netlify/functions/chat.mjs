import { createDifyStream } from '../../server/dify.js';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'POST' } },
    );
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const upstream = await createDifyStream(payload, process.env.DIFY_API_KEY);

    if (!upstream.ok) {
      const detail = await upstream.text();
      return Response.json(
        { error: 'Dify API 请求失败', detail: detail.slice(0, 500) },
        { status: upstream.status },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || '服务暂时不可用' },
      { status: error.statusCode || 500 },
    );
  }
}
