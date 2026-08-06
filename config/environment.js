require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z
    .string()
    .default('postgresql://user:password@localhost:5432/busisync'),
  DATABASE_SSL: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  FIREBASE_PROJECT_ID: z.string().default('bizsync-ai-6b4c4'),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((val) => (val ? val.replace(/\\n/g, '\n') : val)),
  ALLOWED_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
  API_BASE_PATH: z.string().default('/api/v1'),
  META_APP_ID: z.string().default('mock_meta_app_id_12345'),
  META_APP_SECRET: z.string().default('mock_meta_app_secret_abc123xyz'),
  META_WEBHOOK_VERIFY_TOKEN:
    z.string().default('busisync_webhook_verify_token_98765'),
  GRAPH_API_VERSION: z.string().default('v19.0'),
  GRAPH_API_BASE_URL: z.string().default('https://graph.facebook.com'),
  ENCRYPTION_SECRET:
    z.string().default('busisync_aes256_super_secret_key_32bytes!!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation error:', parsed.error.format());
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const env = parsed.success ? parsed.data : envSchema.parse({});

module.exports = env;
