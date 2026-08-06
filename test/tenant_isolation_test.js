const test = require('node:test');
const assert = require('node:assert/strict');
const authTenantMiddleware = require('../middleware/auth_tenant_middleware');

test('authTenantMiddleware - allows authorized workspace access', () => {
  const req = {
    headers: { authorization: 'Bearer mock_jwt_token' },
    params: { workspaceId: 'ws_mock_123' },
  };
  let nextCalled = false;
  const res = {};

  authTenantMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.workspaceId, 'ws_mock_123');
});

test('authTenantMiddleware - blocks unauthorized workspace access with 403', () => {
  const req = {
    headers: { authorization: 'Bearer mock_jwt_token' },
    params: { workspaceId: 'ws_unauthorized_999' },
  };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  authTenantMiddleware(req, res, () => {});

  assert.equal(statusCode, 403);
  assert.equal(responseData.error.code, 'FORBIDDEN');
});
