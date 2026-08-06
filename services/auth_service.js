const workspaceRepository = require('../repositories/workspace_repository');

class AuthService {
  async createSession(user) {
    const memberships = await workspaceRepository.listUserMemberships(user.id);
    return {
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        displayName: user.display_name,
        photoUrl: user.photo_url,
        emailVerified: user.email_verified,
        status: user.status,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
      memberships,
    };
  }

  async getMe(user) {
    return this.createSession(user);
  }
}

module.exports = new AuthService();
