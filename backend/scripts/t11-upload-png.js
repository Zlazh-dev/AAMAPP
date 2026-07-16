// t11-upload-png.js — verifikasi pipeline upload (login → POST /api/uploads → static GET via nginx)
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

// Minimal valid 1x1 PNG (transparent)
const PNG = Buffer.from([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
  0x89,0x00,0x00,0x00,0x0d,0x49,0x44,0x41,
  0x54,0x78,0x9c,0x62,0x00,0x01,0x00,0x00,
  0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,
  0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,
  0x42,0x60,0x82,
]);
const localPath = path.join(os.tmpdir(), `aamapp-t11-${Date.now()}.png`);
fs.writeFileSync(localPath, PNG);

const boundary = '----AAMAPP' + Date.now();
const file = fs.readFileSync(localPath);
const data = Buffer.concat([
  Buffer.from('--' + boundary + '\r\n'),
  Buffer.from('Content-Disposition: form-data; name="file"; filename="test.png"\r\n'),
  Buffer.from('Content-Type: image/png\r\n\r\n'),
  file,
  Buffer.from('\r\n--' + boundary + '--\r\n'),
]);

function req(method, host, port, urlPath, body, headers) {
  return new Promise((resolve) => {
    const r = http.request({hostname: host, port, path: urlPath, method, headers}, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: buf}));
    });
    r.on('error', (e) => resolve({status: 0, err: e.message}));
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  // 1. Login (via host:80 → nginx → backend)
  const login = await req('POST', '127.0.0.1', 80, '/api/auth/login',
    JSON.stringify({email: 'admin@aamapp.sch.id', password: 'admin12345'}),
    {'Content-Type': 'application/json'});
  console.log('LOGIN status=' + login.status);
  if (login.status !== 200 && login.status !== 201) {
    console.error('  body=' + login.body);
    process.exit(1);
  }
  const tk = JSON.parse(login.body).accessToken;
  if (!tk) { console.error('  no accessToken in response'); process.exit(1); }
  console.log('  token len=' + tk.length);

  // 2. Upload
  const up = await req('POST', '127.0.0.1', 80, '/api/uploads', data, {
    'Authorization': 'Bearer ' + tk,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': data.length,
  });
  console.log('UPLOAD status=' + up.status + ' body=' + up.body.slice(0, 200));
  if (up.status !== 200 && up.status !== 201) process.exit(2);
  const upJson = JSON.parse(up.body);
  const fname = upJson.filename;
  const urlRel = upJson.url;
  console.log('  filename=' + fname);
  console.log('  url=' + urlRel);

  // 3. Static get via host:80 (nginx)
  const stat = await req('GET', '127.0.0.1', 80, urlRel, null, {});
  console.log('STATIC status=' + stat.status + ' ctype=' + stat.headers['content-type'] + ' bytes=' + (stat.body?.length || 0));

  // 4. Cleanup temp file
  try { fs.unlinkSync(localPath); } catch {}

  if (stat.status === 200 && String(stat.headers['content-type']).startsWith('image/')) {
    console.log('OK — upload + static GET jalur publik bekerja.');
    process.exit(0);
  } else {
    console.error('FAIL — upload berhasil tapi foto tidak bisa diakses publik.');
    process.exit(3);
  }
})();
