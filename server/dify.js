const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';

export async function createDifyStream(payload, apiKey, signal) {
  if (!apiKey) {
    const error = new Error('服务端未配置 DIFY_API_KEY');
    error.statusCode = 500;
    throw error;
  }

  const query = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!query) {
    const error = new Error('问题不能为空');
    error.statusCode = 400;
    throw error;
  }
  if (query.length > 4000) {
    const error = new Error('问题不能超过 4000 个字符');
    error.statusCode = 400;
    throw error;
  }

  return fetch(DIFY_API_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: 'streaming',
      user: 'web-user-001',
      conversation_id: payload?.conversation_id || '',
    }),
  });
}
