const authService = require('../services/auth_service');

class AuthController {
  async handleSession(req, res) {
    try {
      const result = await authService.createSession(req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('Session error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to create session.' });
    }
  }

  async handleMe(req, res) {
    try {
      const result = await authService.getMe(req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('GetMe error:', err);
      return res.status(500).json({ error: 'InternalError', message: 'Failed to fetch current user profile.' });
    }
  }
}

module.exports = new AuthController();
