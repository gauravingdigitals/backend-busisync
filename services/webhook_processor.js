class WebhookProcessor {
  constructor(realtimePublisher) {
    this.realtimePublisher = realtimePublisher;
    this.processedEvents = new Set();
  }

  processPayload(payload) {
    if (!payload || payload.object !== 'whatsapp_business_account') {
      return { processed: false, reason: 'unsupported_object' };
    }

    const events = [];

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        // Process Messages
        for (const msg of value.messages || []) {
          const eventId = `msg_${msg.id}`;
          if (this.processedEvents.has(eventId)) continue;
          this.processedEvents.add(eventId);

          const event = {
            type: 'messageCreated',
            workspaceId: 'ws_mock_123',
            payload: {
              id: msg.id,
              from: msg.from,
              text: msg.text?.body || '[Media/Unsupported]',
              timestamp: msg.timestamp,
              phoneNumberId,
            },
          };
          events.push(event);
          if (this.realtimePublisher) {
            this.realtimePublisher.broadcast(event.workspaceId, event);
          }
        }

        // Process Message Statuses
        for (const status of value.statuses || []) {
          const eventId = `status_${status.id}_${status.status}`;
          if (this.processedEvents.has(eventId)) continue;
          this.processedEvents.add(eventId);

          const event = {
            type: 'messageStatusUpdated',
            workspaceId: 'ws_mock_123',
            payload: {
              messageId: status.id,
              recipientId: status.recipient_id,
              status: status.status,
              timestamp: status.timestamp,
            },
          };
          events.push(event);
          if (this.realtimePublisher) {
            this.realtimePublisher.broadcast(event.workspaceId, event);
          }
        }
      }
    }

    return { processed: true, count: events.length, events };
  }
}

module.exports = WebhookProcessor;
