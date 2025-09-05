const http = require('http');
const { SocksClient } = require('socks');
const { URL } = require('url');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 10287;
const PROXY_USERNAME = 'ImZPICRQgu';
const PROXY_PASSWORD = 'LoI8WyQAdc';

const server = http.createServer((req, res) => {
  const targetUrl = new URL(req.url);
  
  console.log(`Proxying request to: ${targetUrl.href}`);
  
  const options = {
    proxy: {
      host: PROXY_HOST,
      port: PROXY_PORT,
      type: 5, // SOCKS5
      userId: PROXY_USERNAME,
      password: PROXY_PASSWORD,
    },
    command: 'connect',
    target: {
      host: targetUrl.hostname,
      port: parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80),
    },
  };

  SocksClient.createConnection(options)
    .then((info) => {
      console.log(`Connected to ${targetUrl.hostname}:${targetUrl.port}`);
      
      // Set up the tunnel
      res.writeHead(200, { 'Connection': 'keep-alive' });
      info.socket.pipe(res);
      res.pipe(info.socket);
    })
    .catch((err) => {
      console.error('SOCKS connection failed:', err);
      res.writeHead(500);
      res.end('Proxy connection failed');
    });
});

server.listen(8080, '127.0.0.1', () => {
  console.log('HTTP proxy server running on 127.0.0.1:8080');
});
