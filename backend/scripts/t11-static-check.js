// t11-static-check.js — verifikasi foto hasil upload bisa diakses publik via nginx
// Sumber: file PNG sudah di-upload oleh t11-upload-png.js

const http = require('http');

const FRONTEND_HOST = 'localhost';
const FRONTEND_PORT = 80;
const PNG_NAME = process.argv[2];

if (!PNG_NAME) {
  console.error('Usage: node t11-static-check.js <namafile.png>');
  process.exit(1);
}

function probe(path) {
  return new Promise((resolve) => {
    const url = `${path}`;
    const req = http.get(
      { host: FRONTEND_HOST, port: FRONTEND_PORT, path: url, timeout: 8000 },
      (res) => {
        let bodyLen = 0;
        res.on('data', (chunk) => (bodyLen += chunk.length));
        res.on('end', () => {
          resolve({
            path,
            status: res.statusCode,
            contentType: res.headers['content-type'],
            bytes: bodyLen,
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ path, status: 'TIMEOUT' });
    });
    req.on('error', (err) => {
      resolve({ path, status: 'ERROR', error: err.code });
    });
  });
}

(async () => {
  console.log(`[t11] Probe via nginx (host=${FRONTEND_HOST}:${FRONTEND_PORT})`);
  const uploadProbe = await probe(`/uploads/${PNG_NAME}`);
  console.log(' /uploads/:', JSON.stringify(uploadProbe));

  const controlApi = await probe(`/api/auth/login`);
  console.log(' /api/login :', JSON.stringify(controlApi));

  if (uploadProbe.status === 200 && uploadProbe.contentType?.startsWith('image/')) {
    console.log('[t11] OK — foto dapat diakses publik via /uploads/.');
    process.exit(0);
  } else {
    console.error('[t11] FAIL — foto tidak dapat diakses via /uploads/.');
    process.exit(2);
  }
})();
