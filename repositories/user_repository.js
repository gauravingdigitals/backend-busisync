const pool = require('../database/pool');

class UserRepository {
  async findByFirebaseUid(firebaseUid) {
    const query = 'SELECT * FROM users WHERE firebase_uid = $1 LIMIT 1';
    const { rows } = await pool.query(query, [firebaseUid]);
    return rows[0] || null;
  }

  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1 LIMIT 1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async upsertFromFirebase(decodedToken) {
    const {
      uid: firebaseUid,
      email = null,
      name = null,
      picture = null,
      email_verified = false,
    } = decodedToken;

    const query = `
      INSERT INTO users (
        firebase_uid, email, display_name, photo_url, email_verified, last_login_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
        email_verified = EXCLUDED.email_verified,
        last_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [firebaseUid, email, name, picture, email_verified];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = new UserRepository();
