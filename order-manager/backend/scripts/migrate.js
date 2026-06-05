import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const migrationsDir = path.resolve('migrations');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: '-c search_path=order_user,public',
  });

  try {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.log('No migrations found.');
      return;
    }

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(migrationPath, 'utf8');
      console.log(`Applying ${file}...`);
      await pool.query(sql);
    }

    console.log('Migrations applied successfully.');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
