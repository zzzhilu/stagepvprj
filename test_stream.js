const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/drive/stream/testId',
  method: 'GET',
  headers: {
    'Range': 'bytes=0-100'
  }
}, (res) => {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    console.log('Data chunk length: ' + chunk.length);
  });
});

req.on('error', (e) => {
  console.error('Error: ' + e.message);
});

req.end();
