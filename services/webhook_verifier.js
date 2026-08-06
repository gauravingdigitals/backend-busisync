const crypto = require('crypto');
const env = require('../config/environment');

class WebhookVerifier {
  static verifyChallenge(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    return null;
  }

  static validateSignature(rawBody, signatureHeader) {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expectedHash = crypto
      .createHmac('sha256', env.META_APP_SECRET)
      .update(rawBody)
      .digest('hex');

    const signatureHash = signatureHeader.substring(7);

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(signatureHash, 'hex')
      );
    } catch (e) {
      return false;
    }
  }
}

module.exports = WebhookVerifier;
