import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://order_user:order_pass@localhost:5432/order_manager';

const client = new Client({ connectionString });

try {
  await client.connect();

  const before = await client.query(
    "SELECT id, username, email, user_status, is_active, is_blocked, deleted_at FROM users WHERE username = 'admin' OR email = 'admin@local.dev' ORDER BY created_at DESC LIMIT 1"
  );

  if (before.rows.length === 0) {
    console.log('Admin user not found');
    process.exit(1);
  }

  const admin = before.rows[0];
  await client.query(
    `
      UPDATE users
      SET user_status = 'approved',
          is_active = true,
          is_blocked = false,
          block_reason = NULL,
          blocked_at = NULL,
          deleted_at = NULL,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [admin.id]
  );

  const after = await client.query(
    'SELECT id, username, email, user_status, is_active, is_blocked, deleted_at FROM users WHERE id = $1',
    [admin.id]
  );

  console.log('Admin recovered:', after.rows[0]);
} catch (error) {
  console.error('Recovery failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
