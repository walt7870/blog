import http from 'node:http';
import { createHash } from 'node:crypto';

const server = http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/upload-probe') {
    response.writeHead(404).end();
    return;
  }
  const hash = createHash('sha256');
  let bytes = 0;
  try {
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        response.writeHead(413, { Connection: 'close' }).end();
        return;
      }
      hash.update(chunk);
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ bytes, sha256: hash.digest('hex') }));
  } catch {
    response.destroy();
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(18080, '127.0.0.1', () => {
  console.log('上传探针监听 http://127.0.0.1:18080/upload-probe');
});
