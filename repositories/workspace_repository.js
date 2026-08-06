const pool = require('../database/pool');

const DEFAULT_OWNER_PERMISSIONS = [
  'workspace.read',
  'workspace.write',
  'workspace.delete',
  'workspace.settings.update',
  'members.manage',
  'whatsapp.read',
  'whatsapp.write',
  'whatsapp.connect',
  'email.read',
  'email.write',
  'calendar.read',
  'calendar.write',
  'tasks.read',
  'tasks.write',
  'crm.read',
  'crm.write',
  'workflows.read',
  'workflows.write',
  'gideon.interact',
  'gideon.approve',
  'analytics.read',
];

class WorkspaceRepository {
  async listUserMemberships(userId) {
    const query = `
      SELECT 
        m.id as membership_id,
        m.role,
        m.permissions,
        m.status as membership_status,
        m.joined_at,
        w.id as workspace_id,
        w.name as workspace_name,
        w.slug as workspace_slug,
        w.owner_user_id,
        w.timezone,
        w.locale,
        w.status as workspace_status,
        w.settings
      FROM workspace_memberships m
      JOIN workspaces w ON m.workspace_id = w.id
      WHERE m.user_id = $1 AND m.status = 'active' AND w.status = 'active'
      ORDER BY m.joined_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows.map((row) => ({
      membershipId: row.membership_id,
      role: row.role,
      permissions: row.permissions,
      status: row.membership_status,
      joinedAt: row.joined_at,
      workspace: {
        id: row.workspace_id,
        name: row.workspace_name,
        slug: row.workspace_slug,
        ownerUserId: row.owner_user_id,
        timezone: row.timezone,
        locale: row.locale,
        status: row.workspace_status,
        settings: row.settings,
      },
    }));
  }

  async findMembership(workspaceId, userId) {
    const query = `
      SELECT m.*, w.name as workspace_name, w.slug as workspace_slug
      FROM workspace_memberships m
      JOIN workspaces w ON m.workspace_id = w.id
      WHERE m.workspace_id = $1 AND m.user_id = $2 AND m.status = 'active' AND w.status = 'active'
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [workspaceId, userId]);
    return rows[0] || null;
  }

  async findById(workspaceId) {
    const query = 'SELECT * FROM workspaces WHERE id = $1 LIMIT 1';
    const { rows } = await pool.query(query, [workspaceId]);
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const query = 'SELECT * FROM workspaces WHERE slug = $1 LIMIT 1';
    const { rows } = await pool.query(query, [slug]);
    return rows[0] || null;
  }

  async createWorkspaceWithOwner({
    name,
    slug,
    ownerUserId,
    timezone = 'UTC',
    locale = 'en',
    settings = {},
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const workspaceQuery = `
        INSERT INTO workspaces (name, slug, owner_user_id, timezone, locale, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const workspaceRes = await client.query(workspaceQuery, [
        name,
        slug,
        ownerUserId,
        timezone,
        locale,
        JSON.stringify(settings),
      ]);
      const workspace = workspaceRes.rows[0];

      const membershipQuery = `
        INSERT INTO workspace_memberships (workspace_id, user_id, role, permissions)
        VALUES ($1, $2, 'owner', $3)
        RETURNING *;
      `;
      const membershipRes = await client.query(membershipQuery, [
        workspace.id,
        ownerUserId,
        JSON.stringify(DEFAULT_OWNER_PERMISSIONS),
      ]);

      await client.query('COMMIT');
      return {
        workspace,
        membership: membershipRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateWorkspace(workspaceId, { name, timezone, locale, settings }) {
    const query = `
      UPDATE workspaces SET
        name = COALESCE($2, name),
        timezone = COALESCE($3, timezone),
        locale = COALESCE($4, locale),
        settings = COALESCE($5, settings),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      workspaceId,
      name || null,
      timezone || null,
      locale || null,
      settings ? JSON.stringify(settings) : null,
    ]);
    return rows[0] || null;
  }
}

module.exports = new WorkspaceRepository();
