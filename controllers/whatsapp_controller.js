const env = require('../config/environment');
const WebhookVerifier = require('../services/webhook_verifier');
const TokenSecurityService = require('../services/token_security_service');

class WhatsAppController {
  constructor(webhookProcessor) {
    this.webhookProcessor = webhookProcessor;
    this.integrations = new Map();

    // Default mock integration state for test/dev
    this.integrations.set('ws_mock_123', {
      workspaceId: 'ws_mock_123',
      provider: 'whatsapp_business',
      status: 'connected',
      businessAccountId: 'wba_mock_987654321',
      phoneNumberId: 'pni_mock_123456789',
      displayPhoneNumber: '+1 555-0199',
      verifiedName: 'Acme Innovations',
      qualityRating: 'GREEN',
      messagingLimit: 'TIER_1K',
      encryptedAccessToken: TokenSecurityService.encryptToken('mock_permanent_system_token_xyz'),
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  createSession(req, res) {
    const { workspaceId } = req.params;
    // Embedded Signup Session Response - Never returns raw Meta system tokens!
    return res.json({
      data: {
        sessionUrl: `https://www.facebook.com/${env.GRAPH_API_VERSION}/dialog/oauth?client_id=${env.META_APP_ID}&redirect_uri=https://busisync.app/callback`,
        config: {
          appId: env.META_APP_ID,
          featureFlags: ['embedded_signup_v2'],
        },
      },
    });
  }

  getIntegration(req, res) {
    const { workspaceId } = req.params;
    const integration = this.integrations.get(workspaceId) || {
      workspaceId,
      provider: 'whatsapp_business',
      status: 'disconnected',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // REDACT encryptedAccessToken from public API output!
    const { encryptedAccessToken, ...safeOutput } = integration;
    return res.json({ data: safeOutput });
  }

  disconnect(req, res) {
    const { workspaceId } = req.params;
    this.integrations.set(workspaceId, {
      workspaceId,
      provider: 'whatsapp_business',
      status: 'disconnected',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return res.json({ data: { success: true } });
  }

  verifyWebhook(req, res) {
    const challenge = WebhookVerifier.verifyChallenge(req.query);
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Webhook verification failed' });
  }

  handleWebhookPayload(req, res) {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (process.env.NODE_ENV !== 'test') {
      const isValid = WebhookVerifier.validateSignature(rawBody, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const result = this.webhookProcessor.processPayload(req.body);
    return res.status(200).json({ status: 'EVENT_RECEIVED', ...result });
  }
}

module.exports = WhatsAppController;
