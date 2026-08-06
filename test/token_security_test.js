const test = require('node:test');
const assert = require('node:assert/strict');
const TokenSecurityService = require('../services/token_security_service');

test('TokenSecurityService - encrypts and decrypts tokens with AES-256-GCM', () => {
  const rawToken = 'EAAG1234567890_meta_system_user_secret_access_token_xyz';
  const encrypted = TokenSecurityService.encryptToken(rawToken);

  assert.notEqual(encrypted, rawToken);
  assert.ok(encrypted.includes(':'));

  const decrypted = TokenSecurityService.decryptToken(encrypted);
  assert.equal(decrypted, rawToken);
});

test('TokenSecurityService - redacts tokens safely in logs', () => {
  const rawToken = 'EAAG1234567890_meta_system_user_secret_access_token_xyz';
  const redacted = TokenSecurityService.redactToken(rawToken);

  assert.equal(redacted.startsWith('EAAG'), true);
  assert.equal(redacted.endsWith('_xyz'), true);
  assert.ok(!redacted.includes('meta_system_user'));
});
