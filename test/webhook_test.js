const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const env = require('../config/environment');
const WebhookVerifier = require('../services/webhook_verifier');
const WebhookProcessor = require('../services/webhook_processor');

test('WebhookVerifier - verifies challenge token correctly', () => {
  const query = {
    'hub.mode': 'subscribe',
    'hub.verify_token': env.META_WEBHOOK_VERIFY_TOKEN,
    'hub.challenge': 'CHALLENGE_CODE_998877',
  };

  const result = WebhookVerifier.verifyChallenge(query);
  assert.equal(result, 'CHALLENGE_CODE_998877');
});

test('WebhookVerifier - rejects invalid verify token', () => {
  const query = {
    'hub.mode': 'subscribe',
    'hub.verify_token': 'WRONG_TOKEN',
    'hub.challenge': 'CHALLENGE_CODE_998877',
  };

  const result = WebhookVerifier.verifyChallenge(query);
  assert.equal(result, null);
});

test('WebhookVerifier - validates HMAC-SHA256 signatures correctly', () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const hash = crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(body)
    .digest('hex');

  const validHeader = `sha256=${hash}`;
  assert.equal(WebhookVerifier.validateSignature(body, validHeader), true);

  const invalidHeader = `sha256=invalid_hash_1234567890`;
  assert.equal(WebhookVerifier.validateSignature(body, invalidHeader), false);
});

test('WebhookProcessor - processes inbound message and status idempotently', () => {
  const processor = new WebhookProcessor();
  const samplePayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'wba_123',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550199', phone_number_id: 'pni_123' },
              messages: [
                {
                  from: '15550101',
                  id: 'wamid.HBgL123456',
                  timestamp: '1700000000',
                  text: { body: 'Hello from customer!' },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  // First ingestion
  const res1 = processor.processPayload(samplePayload);
  assert.equal(res1.processed, true);
  assert.equal(res1.count, 1);

  // Duplicate ingestion (idempotent check)
  const res2 = processor.processPayload(samplePayload);
  assert.equal(res2.processed, true);
  assert.equal(res2.count, 0); // Duplicate ignored!
});
