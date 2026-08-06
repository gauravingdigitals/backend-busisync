const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations() {
  await ensureMigrationTable();
  const res = await pool.query('SELECT name FROM schema_migrations ORDER BY id ASC');
  return res.rows.map((row) => row.name);
}

async function migrateUp() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const executed = await getExecutedMigrations();

  for (const file of files) {
    if (!executed.includes(file)) {
      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migration completed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed: ${file}`, err);
        throw err;
      } finally {
        client.release();
      }
    }
  }
}

async function status() {
  const executed = await getExecutedMigrations();
  console.log('Executed migrations:', executed);
}

if (require.main === module) {
  const cmd = process.argv[2] || 'up';
  if (cmd === 'status') {
    status().then(() => pool.end());
  } else {
    migrateUp()
      .then(() => pool.end())
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = { migrateUp, status };
