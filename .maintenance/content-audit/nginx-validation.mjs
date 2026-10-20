import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const container = 'blog-nginx-doc-audit'
const docker = (args, input) => execFileSync('docker', ['exec', '-i', container, ...args], {
  input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
})
const put = (path, value) => docker(['tee', path], value)
const blocks = file => [...readFileSync(file, 'utf8').matchAll(/^```nginx\n([\s\S]*?)^```/gm)].map(match => match[1])
const main = blocks('docs/linux/nginx/nginx.md')[1]
const location = blocks('docs/linux/nginx/location.md')[0]
const tls = blocks('docs/linux/nginx/auto-renew-cert.md')[0]
assert(main && location && tls)
docker(['mkdir', '-p', '/srv/order-web/assets', '/etc/nginx/ssl', '/tmp/blog-nginx'])
put('/srv/order-web/index.html', '<html><body>order-spa</body></html>\n')
put('/srv/order-web/assets/app.v1.js', 'console.log("order-resource")\n')
put('/tmp/blog-nginx/backend.py', `from http.server import BaseHTTPRequestHandler, HTTPServer
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(self.path.encode())
HTTPServer(('127.0.0.1', 8080), Handler).serve_forever()
`)
docker(['openssl', 'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes',
  '-keyout', '/etc/nginx/ssl/example.com.key', '-out', '/etc/nginx/ssl/example.com.crt',
  '-days', '1', '-subj', '/CN=example.com', '-addext', 'subjectAltName=DNS:example.com'])
const stripped = main.replace('listen 8088;', 'listen 8090;').replace('proxy_pass http://127.0.0.1:8080;', 'proxy_pass http://127.0.0.1:8080/;')
put('/tmp/blog-nginx/nginx.conf', `pid /tmp/blog-nginx/nginx.pid;
error_log /tmp/blog-nginx/error.log notice;
events { worker_connections 128; }
http {
    include /etc/nginx/mime.types;
    access_log /tmp/blog-nginx/access.log;
    ${main}
    ${location}
    ${stripped}
    ${tls}
}
`)
docker(['nginx', '-t', '-c', '/tmp/blog-nginx/nginx.conf'])
docker(['sh', '-c', 'python3 /tmp/blog-nginx/backend.py > /tmp/blog-nginx/backend.log 2>&1 &'])
docker(['nginx', '-c', '/tmp/blog-nginx/nginx.conf'])
const request = (port, path, host) => {
  const output = docker(['curl', '--noproxy', '*', '--retry', '5', '--retry-connrefused', '--retry-delay', '1',
    '-sS', '-w', '\n%{http_code}', '-H', `Host: ${host}`, `http://127.0.0.1:${port}${path}`])
  const split = output.lastIndexOf('\n')
  return { body: output.slice(0, split), status: Number(output.slice(split + 1)) }
}
for (const [path, label] of [
  ['/api/orders?format=csv', 'exact'], ['/api/report.csv', 'api-prefix'],
  ['/reports/month.csv', 'extension-regex'], ['/reports/month', 'reports-prefix'], ['/other', 'fallback-prefix']
]) {
  const actual = request(8089, path, 'location.example.com')
  assert.equal(actual.status, 200)
  assert.equal(actual.body.trim(), label)
  console.log(`location ${path} -> ${label}`)
}
assert.equal(request(8088, '/healthz', 'orders.example.com').body.trim(), 'nginx-ready')
assert.equal(request(8088, '/assets/missing.js', 'orders.example.com').status, 404)
assert.match(request(8088, '/assets/app.v1.js', 'orders.example.com').body, /order-resource/)
assert.match(request(8088, '/orders/1001', 'orders.example.com').body, /order-spa/)
assert.equal(request(8088, '/api/orders/1001?limit=2', 'orders.example.com').body, '/api/orders/1001?limit=2')
assert.equal(request(8090, '/api/orders/1001?limit=2', 'orders.example.com').body, '/orders/1001?limit=2')
docker(['bash', '-o', 'pipefail', '-c', 'openssl s_client -connect 127.0.0.1:443 -servername example.com -verify_hostname example.com -verify_return_error -CAfile /etc/nginx/ssl/example.com.crt </dev/null | openssl x509 -noout -dates -fingerprint -sha256'])
docker(['nginx', '-s', 'reload', '-c', '/tmp/blog-nginx/nginx.conf'])
assert.equal(request(8088, '/healthz', 'orders.example.com').status, 200)
console.log('nginx_doc_validation_passed: SPA, asset404, proxy URI, isolated TLS and reload')
