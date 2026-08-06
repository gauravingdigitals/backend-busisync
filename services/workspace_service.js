const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const workspaceRepository = require('../repositories/workspace_repository');
const auditRepository = require('../repositories/audit_repository');

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  timezone: z.string().default('UTC'),
  locale: z.string().default('en'),
  settings: z.record(z.unknown()).optional().default({}),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

class WorkspaceService {
  generateSlug(name) {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = uuidv4().substring(0, 6);
    return `${base || 'workspace'}-${randomSuffix}`;
  }

  async listWorkspaces(userId) {
    return await workspaceRepository.listUserMemberships(userId);
  }

  async createWorkspace(user, payload, reqContext = {}) {
    const validated = createWorkspaceSchema.parse(payload);
    const slug = this.generateSlug(validated.name);

    const { workspace, membership } =
      await workspaceRepository.createWorkspaceWithOwner({
        name: validated.name,
        slug,
        ownerUserId: user.id,
        timezone: validated.timezone,
        locale: validated.locale,
        settings: validated.settings,
      });

    await auditRepository.record({
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: 'workspace.create',
      entityType: 'workspace',
      entityId: workspace.id,
      requestId: reqContext.requestId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      afterData: { workspace, membership },
    });

    return {
      workspace,
      membership,
    };
  }

  async getWorkspaceById(workspaceId, userId) {
    const membership = await workspaceRepository.findMembership(workspaceId, userId);
    if (!membership) return null;
    const workspace = await workspaceRepository.findById(workspaceId);
    return {
      workspace,
      membership,
    };
  }

  async updateWorkspace(workspaceId, user, payload, reqContext = {}) {
    const validated = updateWorkspaceSchema.parse(payload);
    const before = await workspaceRepository.findById(workspaceId);

    const updated = await workspaceRepository.updateWorkspace(
      workspaceId,
      validated
    );

    await auditRepository.record({
      workspaceId,
      actorUserId: user.id,
      action: 'workspace.update',
      entityType: 'workspace',
      entityId: workspaceId,
      requestId: reqContext.requestId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  }
}

module.exports = new WorkspaceService();
