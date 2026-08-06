function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Workspace membership is required.',
      });
    }

    const { role, permissions } = req.membership;
    if (role === 'owner') {
      return next();
    }

    const perms = Array.isArray(permissions)
      ? permissions
      : typeof permissions === 'string'
      ? JSON.parse(permissions)
      : [];

    if (perms.includes('*') || perms.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Required permission '${requiredPermission}' is missing for this workspace.`,
    });
  };
}

module.exports = requirePermission;
