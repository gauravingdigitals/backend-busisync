const pool = require('../database/pool');

class AuditRepository {
  async record({
    workspaceId = null,
    actorUserId = null,
    action,
    entityType,
    entityId = null,
    requestId = null,
    ipAddress = null,
    userAgent = null,
    beforeData = null,
    afterData = null,
    metadata = null,
  }) {
    const query = `
      INSERT INTO audit_logs (
        workspace_id, actor_user_id, action, entity_type, entity_id,
        request_id, ip_address, user_agent, before_data, after_data, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      workspaceId,
      actorUserId,
      action,
      entityType,
      entityId,
      requestId,
      ipAddress,
      userAgent,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      metadata ? JSON.stringify(metadata) : null,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = new AuditRepository();
