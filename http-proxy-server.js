const http = require('http');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { URL } = require('url');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 10287;
const PROXY_USERNAME = 'ImZPICRQgu';
const PROXY_PASSWORD = 'LoI8WyQAdc';

const server = http.createServer((req, res) => {
  const targetUrl = new URL(req.url);
  
  console.log(`Proxying request to: ${targetUrl.href}`);
  
  const options = {
    hostname: targetUrl.hostname,
    port: parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: req.headers,
    agent: new SocksProxyAgent(`socks5://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}`)
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error: ' + err.message);
  });

  req.pipe(proxyReq);
});

const PORT = 8080;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`HTTP proxy server running on http://127.0.0.1:${PORT}`);
});
