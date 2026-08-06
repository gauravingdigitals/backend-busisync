const env = require('../config/environment');
const TokenSecurityService = require('./token_security_service');

class WhatsAppGraphClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = `${env.GRAPH_API_BASE_URL}/${env.GRAPH_API_VERSION}`;
  }

  async sendMessage(phoneNumberId, payload) {
    // Standard Graph API payload format mapping for Meta Cloud API
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: payload.type || 'text',
      ...(payload.text ? { text: payload.text } : {}),
      ...(payload.template ? { template: payload.template } : {}),
    };

    // Simulate or call Graph API
    if (process.env.NODE_ENV === 'test' || !this.accessToken) {
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: payload.to, wa_id: payload.to }],
        messages: [{ id: `wamid.HBgL${Date.now()}` }],
      };
    }

    const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error?.message || 'Meta Graph API request failed';
      const errorCode = data.error?.code || 'GRAPH_API_ERROR';
      throw new Error(`[${errorCode}] ${errorMsg}`);
    }

    return data;
  }
}

module.exports = WhatsAppGraphClient;
