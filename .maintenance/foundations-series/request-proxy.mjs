import http from 'node:http'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
const evidence = new URL('./evidence/', import.meta.url)
mkdirSync(evidence, { recursive: true })
const output = new URL('requests.jsonl', evidence)
writeFileSync(output, '')
const upstreamPort = Number(process.env.FOUNDATIONS_UPSTREAM || 5194)
const server = http.createServer((request, response) => {
  const start = Date.now()
  const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${upstreamPort}` } }, result => {
    let bytes = 0
    response.writeHead(result.statusCode, result.headers)
    result.on('data', chunk => { bytes += chunk.length })
    result.on('end', () => appendFileSync(output, JSON.stringify({ path: request.url, status: result.statusCode, bytes, milliseconds: Date.now() - start }) + '\n'))
    result.pipe(response)
  })
  upstream.on('error', () => { response.writeHead(502); response.end('本地验收上游未启动') })
  request.pipe(upstream)
})
server.listen(5193, '127.0.0.1', () => console.log(`仅本地验收：5193 → ${upstreamPort}，请求记录 ${output.pathname}`))
process.on('SIGTERM', () => server.close())
