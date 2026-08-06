const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');

const env = require('./config/environment');
const pool = require('./database/pool');
const { initFirebaseAdmin } = require('./config/firebase_admin');

const authenticateFirebase = require('./middleware/authenticate_firebase');
const requireWorkspace = require('./middleware/require_workspace');
const requirePermission = require('./middleware/require_permission');

const authController = require('./controllers/auth_controller');
const workspaceController = require('./controllers/workspace_controller');
const deviceController = require('./controllers/device_controller');

const WebhookProcessor = require('./services/webhook_processor');
const RealtimePublisher = require('./services/realtime_publisher');
const WhatsAppController = require('./controllers/whatsapp_controller');
const ConversationController = require('./controllers/conversation_controller');

const logger = pino({ level: env.LOG_LEVEL });
const app = express();
const server = http.createServer(app);

// 1. Initialize Firebase Admin
initFirebaseAdmin();

// 2. Realtime WebSocket Publisher & Webhook Processor Pipeline
const realtimePublisher = new RealtimePublisher(server);
const webhookProcessor = new WebhookProcessor(realtimePublisher);
const whatsappController = new WhatsAppController(webhookProcessor);
const conversationController = new ConversationController();

// 3. Security Headers & Request ID & Logging Middleware
app.use(helmet());
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
  })
);

// 4. CORS Setup
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === '*' ? true : env.ALLOWED_ORIGINS.split(','),
    credentials: true,
  })
);

// 5. JSON Body Parser with rawBody preservation for Meta Webhooks
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// 6. Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many authentication attempts.' },
});

app.use('/api/', globalLimiter);

// 7. Health & Readiness Endpoints
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ready',
      environment: env.NODE_ENV,
      database: 'connected',
      firebase: 'initialized',
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unready',
      environment: env.NODE_ENV,
      database: 'disconnected',
      error: err.message,
    });
  }
});

// 8. Public Meta Webhook Endpoints (Verified via Signature & Challenge)
app.get('/v1/integrations/whatsapp/webhook', (req, res) =>
  whatsappController.verifyWebhook(req, res)
);
app.post('/v1/integrations/whatsapp/webhook', (req, res) =>
  whatsappController.handleWebhookPayload(req, res)
);
app.get('/api/v1/webhooks/whatsapp', (req, res) =>
  whatsappController.verifyWebhook(req, res)
);
app.post('/api/v1/webhooks/whatsapp', (req, res) =>
  whatsappController.handleWebhookPayload(req, res)
);

// 9. API v1 Auth & Workspace Routes
const router = express.Router();

router.post('/auth/session', authLimiter, authenticateFirebase, (req, res) =>
  authController.handleSession(req, res)
);
router.get('/me', authenticateFirebase, (req, res) =>
  authController.handleMe(req, res)
);

router.get('/workspaces', authenticateFirebase, (req, res) =>
  workspaceController.listWorkspaces(req, res)
);
router.post('/workspaces', authenticateFirebase, (req, res) =>
  workspaceController.createWorkspace(req, res)
);
router.get(
  '/workspaces/:workspaceId',
  authenticateFirebase,
  requireWorkspace,
  (req, res) => workspaceController.getWorkspace(req, res)
);
router.patch(
  '/workspaces/:workspaceId',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('workspace.settings.update'),
  (req, res) => workspaceController.updateWorkspace(req, res)
);

router.post('/devices/push-token', authenticateFirebase, (req, res) =>
  deviceController.registerToken(req, res)
);
router.delete('/devices/push-token', authenticateFirebase, (req, res) =>
  deviceController.revokeToken(req, res)
);

// WhatsApp & Conversation Routes (Production Authenticated & Tenant Scoped)
router.post(
  '/workspaces/:workspaceId/integrations/whatsapp/sessions',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.connect'),
  (req, res) => whatsappController.createSession(req, res)
);
router.get(
  '/workspaces/:workspaceId/integrations/whatsapp',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.read'),
  (req, res) => whatsappController.getIntegration(req, res)
);
router.delete(
  '/workspaces/:workspaceId/integrations/whatsapp',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.connect'),
  (req, res) => whatsappController.disconnect(req, res)
);

router.get(
  '/workspaces/:workspaceId/conversations',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.read'),
  (req, res) => conversationController.getConversations(req, res)
);
router.get(
  '/workspaces/:workspaceId/conversations/:id',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.read'),
  (req, res) => conversationController.getConversationById(req, res)
);
router.get(
  '/workspaces/:workspaceId/conversations/:id/messages',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.read'),
  (req, res) => conversationController.getMessages(req, res)
);
router.post(
  '/workspaces/:workspaceId/conversations/:id/messages',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.write'),
  (req, res) => conversationController.sendMessage(req, res)
);
router.post(
  '/workspaces/:workspaceId/conversations/:id/notes',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.write'),
  (req, res) => conversationController.addNote(req, res)
);
router.patch(
  '/workspaces/:workspaceId/conversations/:id/assignment',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('members.manage'),
  (req, res) => conversationController.updateAssignment(req, res)
);
router.patch(
  '/workspaces/:workspaceId/conversations/:id/status',
  authenticateFirebase,
  requireWorkspace,
  requirePermission('whatsapp.write'),
  (req, res) => conversationController.updateStatus(req, res)
);

app.use('/api/v1', router);

// 10. Centralized 404 & Error Handlers
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.url} not found.` });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'InternalError', message: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  server.listen(env.PORT, () => {
    logger.info(`BusiSync Production Backend listening on port ${env.PORT}`);
  });
}

module.exports = {
  app,
  server,
  whatsappController,
  conversationController,
  webhookProcessor,
};
