const { verifyIdToken } = require('../config/firebase_admin');
const userRepository = require('../repositories/user_repository');

async function authenticateFirebase(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer token is missing.',
    });
  }

  try {
    const decodedToken = await verifyIdToken(idToken);
    const user = await userRepository.upsertFromFirebase(decodedToken);

    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Your account is inactive or disabled.',
      });
    }

    req.auth = decodedToken;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, expired, or revoked authentication token.',
    });
  }
}

module.exports = authenticateFirebase;
