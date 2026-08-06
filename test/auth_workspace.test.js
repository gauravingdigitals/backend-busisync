const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');

async function makeRequest(path, options = {}) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:${process.env.PORT || 8089}${path}`,
      options,
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body ? JSON.parse(body) : null,
            });
          } catch (_) {
            resolve({ statusCode: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

test('BusiSync Backend Production Integration Suite', async (t) => {
  let serverInstance;

  t.before(async () => {
    const port = 8089;
    process.env.PORT = port;
    await new Promise((resolve) => {
      serverInstance = app.listen(port, resolve);
    });
  });

  t.after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  await t.test('GET /health returns status ok', async () => {
    const res = await makeRequest('/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  await t.test('GET /ready checks system readiness', async () => {
    const res = await makeRequest('/ready');
    assert.ok(res.statusCode === 200 || res.statusCode === 503);
    assert.ok(res.body.environment);
  });

  await t.test('POST /api/v1/auth/session without Authorization header returns 401', async () => {
    const res = await makeRequest('/api/v1/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  await t.test('GET /api/v1/me with invalid token returns 401', async () => {
    const res = await makeRequest('/api/v1/me', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid_firebase_token_xyz',
      },
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  await t.test('GET /api/v1/workspaces/ws_non_existent without valid auth returns 401', async () => {
    const res = await makeRequest('/api/v1/workspaces/ws_non_existent', {
      method: 'GET',
    });
    assert.strictEqual(res.statusCode, 401);
  });
});
