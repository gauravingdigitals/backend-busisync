class ConversationController {
  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this._seedMockData();
  }

  _seedMockData() {
    const now = new Date().toISOString();
    this.conversations.set('conv_1', {
      id: 'conv_1',
      workspaceId: 'ws_mock_123',
      provider: 'whatsapp_business',
      contactId: 'cnt_1',
      contactName: 'Alice Smith',
      contactPhoneNumber: '+1 555-0101',
      status: 'open',
      priority: 'high',
      unreadCount: 2,
      lastMessagePreview: 'Hi! Can you send me the invoice for Q3 services?',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    this.messages.set('conv_1', [
      {
        id: 'msg_101',
        conversationId: 'conv_1',
        direction: 'inbound',
        type: 'text',
        senderId: 'cnt_1',
        senderDisplayName: 'Alice Smith',
        text: 'Hello BusiSync team!',
        status: 'read',
        sentAt: now,
        createdAt: now,
      },
      {
        id: 'msg_102',
        conversationId: 'conv_1',
        direction: 'inbound',
        type: 'text',
        senderId: 'cnt_1',
        senderDisplayName: 'Alice Smith',
        text: 'Hi! Can you send me the invoice for Q3 services?',
        status: 'delivered',
        sentAt: now,
        createdAt: now,
      },
    ]);
  }

  getConversations(req, res) {
    const { workspaceId } = req.params;
    const { search, status, unreadOnly, assignedTo } = req.query;

    let list = Array.from(this.conversations.values()).filter((c) => c.workspaceId === workspaceId);

    if (status) list = list.filter((c) => c.status === status);
    if (unreadOnly === 'true') list = list.filter((c) => c.unreadCount > 0);
    if (assignedTo) list = list.filter((c) => c.assignedUserId === assignedTo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.contactPhoneNumber.includes(q) ||
          c.lastMessagePreview.toLowerCase().includes(q)
      );
    }

    return res.json({ data: list, hasMore: false, nextCursor: null });
  }

  getConversationById(req, res) {
    const { id } = req.params;
    const conv = this.conversations.get(id);
    if (!conv) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }
    return res.json({ data: conv });
  }

  getMessages(req, res) {
    const { id } = req.params;
    const list = this.messages.get(id) || [];
    return res.json({ data: list, hasMore: false, nextCursor: null });
  }

  sendMessage(req, res) {
    const { id } = req.params;
    const { text, replyToMessageId } = req.body;
    const conv = this.conversations.get(id);

    if (!conv) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const now = new Date().toISOString();
    const msgId = `msg_${Date.now()}`;

    const msg = {
      id: msgId,
      conversationId: id,
      providerMessageId: `wamid_${msgId}`,
      direction: 'outbound',
      type: 'text',
      senderId: req.user.id,
      senderDisplayName: 'Sam Founder',
      text,
      replyToMessageId,
      status: 'sent',
      sentAt: now,
      createdAt: now,
    };

    if (!this.messages.has(id)) this.messages.set(id, []);
    this.messages.get(id).push(msg);

    conv.lastMessagePreview = text;
    conv.lastMessageAt = now;
    conv.updatedAt = now;

    return res.status(201).json({ data: msg });
  }

  addNote(req, res) {
    const { id } = req.params;
    const { text } = req.body;

    const now = new Date().toISOString();
    const noteId = `note_${Date.now()}`;

    const note = {
      id: noteId,
      conversationId: id,
      direction: 'internalNote',
      type: 'text',
      senderId: req.user.id,
      senderDisplayName: 'Sam Founder',
      text,
      status: 'sent',
      sentAt: now,
      createdAt: now,
    };

    if (!this.messages.has(id)) this.messages.set(id, []);
    this.messages.get(id).push(note);

    return res.status(201).json({ data: note });
  }

  updateAssignment(req, res) {
    const { id } = req.params;
    const { assignedUserId, assignedUserName } = req.body;
    const conv = this.conversations.get(id);

    if (!conv) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    conv.assignedUserId = assignedUserId;
    conv.assignedUserName = assignedUserName;
    conv.updatedAt = new Date().toISOString();

    return res.json({ data: conv });
  }

  updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const conv = this.conversations.get(id);

    if (!conv) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    conv.status = status;
    conv.updatedAt = new Date().toISOString();

    return res.json({ data: conv });
  }
}

module.exports = ConversationController;
