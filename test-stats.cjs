const https = require('https');
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cCI6Im9wZXJhdG9yIiwiaWF0IjoxNzU2MTQxNjkxLCJleHAiOjE3NTYyMjgwOTF9.ArKn6pclpchabx2uH1wcIYzoYomqnybCTdqh1OxQKuI';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stats',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
