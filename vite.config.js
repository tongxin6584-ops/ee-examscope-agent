import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createDifyStream } from './server/dify.js';

function difyDevProxy() {
  return {
    name: 'dify-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const env = loadEnv('', process.cwd(), '');
          const controller = new AbortController();
          res.on('close', () => {
            if (!res.writableEnded) controller.abort();
          });
          const upstream = await createDifyStream(
            body,
            env.DIFY_API_KEY,
            controller.signal,
          );

          res.statusCode = upstream.status;
          res.setHeader(
            'Content-Type',
            upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8',
          );
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');

          if (!upstream.body) {
            res.end(await upstream.text());
            return;
          }

          for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
          res.end();
        } catch (error) {
          if (res.headersSent) {
            res.end();
            return;
          }
          res.statusCode = error.statusCode || 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || '服务暂时不可用' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), difyDevProxy()],
});
