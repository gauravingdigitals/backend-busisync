const crypto = require('crypto');
const pool = require('../database/pool');
const env = require('../config/environment');

class DeviceController {
  async registerToken(req, res) {
    const { token, platform, deviceId, appVersion } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ error: 'BadRequest', message: 'Token and platform are required.' });
    }

    const workspaceId = req.headers['x-workspace-id'] || null;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Simple symmetric encryption for secure storage
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(env.ENCRYPTION_SECRET).digest().slice(0, 32),
      Buffer.alloc(16, 0)
    );
    let encryptedToken = cipher.update(token, 'utf8', 'hex');
    encryptedToken += cipher.final('hex');

    try {
      const query = `
        INSERT INTO device_tokens (
          workspace_id, user_id, token_hash, encrypted_token, platform, device_id, app_version, last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (token_hash) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          device_id = COALESCE(EXCLUDED.device_id, device_tokens.device_id),
          app_version = COALESCE(EXCLUDED.app_version, device_tokens.app_version),
          revoked_at = NULL,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, platform, device_id, last_seen_at;
      `;
      const { rows } = await pool.query(query, [
        workspaceId,
        req.user.id,
        tokenHash,
        encryptedToken,
        platform,
        deviceId || null,
        appVersion || null,
      ]);
      return res.status(200).json({ status: 'registered', device: rows[0] });
    } catch (err) {
      console.error('Device token registration error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to register device token.' });
    }
  }

  async revokeToken(req, res) {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'BadRequest', message: 'Token is required.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
      await pool.query(
        'UPDATE device_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND user_id = $2',
        [tokenHash, req.user.id]
      );
      return res.status(200).json({ status: 'revoked' });
    } catch (err) {
      console.error('Device token revocation error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to revoke device token.' });
    }
  }
}

module.exports = new DeviceController();
