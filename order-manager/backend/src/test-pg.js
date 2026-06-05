import pg from 'pg';

const client = new pg.Client({
  user: 'order_user',
  password: 'order_pass',
  host: '127.0.0.1',  // явно IPv4
  port: 5432,
  database: 'order_manager',
  ssl: false,
});

try {
  await client.connect();
  const result = await client.query('SELECT NOW()');
  console.log('✅ Connected!', result.rows[0]);
  await client.end();
} catch (err) {
  console.error('❌ Failed:', err.message);
}