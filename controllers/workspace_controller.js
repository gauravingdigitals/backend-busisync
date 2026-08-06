const workspaceService = require('../services/workspace_service');
const { ZodError } = require('zod');

class WorkspaceController {
  async listWorkspaces(req, res) {
    try {
      const items = await workspaceService.listWorkspaces(req.user.id);
      return res.status(200).json(items);
    } catch (err) {
      console.error('List workspaces error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to list workspaces.' });
    }
  }

  async createWorkspace(req, res) {
    try {
      const result = await workspaceService.createWorkspace(req.user, req.body, {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(422).json({ error: 'UnprocessableEntity', details: err.errors });
      }
      console.error('Create workspace error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to create workspace.' });
    }
  }

  async getWorkspace(req, res) {
    try {
      const workspaceId = req.params.workspaceId || req.params.id;
      const result = await workspaceService.getWorkspaceById(workspaceId, req.user.id);
      if (!result) {
        return res.status(404).json({ error: 'NotFound', message: 'Workspace not found.' });
      }
      return res.status(200).json(result);
    } catch (err) {
      console.error('Get workspace error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to fetch workspace.' });
    }
  }

  async updateWorkspace(req, res) {
    try {
      const workspaceId = req.params.workspaceId || req.params.id;
      const updated = await workspaceService.updateWorkspace(
        workspaceId,
        req.user,
        req.body,
        {
          requestId: req.id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      return res.status(200).json(updated);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(422).json({ error: 'UnprocessableEntity', details: err.errors });
      }
      console.error('Update workspace error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to update workspace.' });
    }
  }
}

module.exports = new WorkspaceController();
