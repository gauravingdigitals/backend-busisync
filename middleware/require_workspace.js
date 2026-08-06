const workspaceRepository = require('../repositories/workspace_repository');

async function requireWorkspace(req, res, next) {
  const workspaceId =
    req.params.workspaceId ||
    req.params.id ||
    req.headers['x-workspace-id'];

  if (!workspaceId) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Workspace ID parameter or X-Workspace-Id header is required.',
    });
  }

  try {
    const membership = await workspaceRepository.findMembership(
      workspaceId,
      req.user.id
    );

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not an active member of this workspace.',
      });
    }

    req.workspace = {
      id: workspaceId,
      name: membership.workspace_name,
      slug: membership.workspace_slug,
    };
    req.membership = membership;
    next();
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to verify workspace membership.',
    });
  }
}

module.exports = requireWorkspace;
