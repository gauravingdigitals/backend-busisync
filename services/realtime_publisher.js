const WebSocket = require('ws');

class RealtimePublisher {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.subscriptions = new Map(); // workspaceId -> Set<WebSocket>

    this.wss.on('connection', (ws, req) => {
      let workspaceId = null;

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.action === 'subscribe' && data.workspaceId) {
            workspaceId = data.workspaceId;
            if (!this.subscriptions.has(workspaceId)) {
              this.subscriptions.set(workspaceId, new Set());
            }
            this.subscriptions.get(workspaceId).add(ws);
            ws.send(JSON.stringify({ event: 'subscribed', workspaceId }));
          }
        } catch (e) {
          // Ignore invalid messages
        }
      });

      ws.on('close', () => {
        if (workspaceId && this.subscriptions.has(workspaceId)) {
          this.subscriptions.get(workspaceId).delete(ws);
        }
      });
    });
  }

  broadcast(workspaceId, eventData) {
    const clients = this.subscriptions.get(workspaceId);
    if (clients) {
      const payload = JSON.stringify(eventData);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    }
  }
}

module.exports = RealtimePublisher;
