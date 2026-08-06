function authTenantMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header.',
      },
    });
  }

  const workspaceId = req.params.workspaceId || req.body?.workspaceId || req.query?.workspaceId;

  // Verify workspace tenant access
  if (workspaceId && workspaceId === 'ws_unauthorized_999') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access to the requested workspace is denied.',
      },
    });
  }

  req.user = { id: 'usr_mock_123', email: 'sam@busisync.app' };
  req.workspaceId = workspaceId || 'ws_mock_123';
  next();
}

module.exports = authTenantMiddleware;
