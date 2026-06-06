import { Pool, PoolClient } from 'pg';
import { getEnv } from './env';

let pool: Pool;

export const connectDatabase = () => {
  try {
    const env = getEnv();
    pool = new Pool({
      user: env.DB_USER,
      host: env.DB_HOST,
      database: env.DB_NAME,
      password: env.DB_PASSWORD,
      port: env.DB_PORT,
      // Enforce TLS in production; verify the server certificate.
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    });

    console.log('✅ Database connection pool created');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
};

export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Run `fn` inside a single transaction on a dedicated pooled client.
 *
 * Use this for any multi-statement write that must be atomic. Unlike calling
 * `query('BEGIN')` / `query('COMMIT')` through the shared helper — which can run
 * each statement on a DIFFERENT pooled connection and is therefore NOT a real
 * transaction — this pins one client for the whole unit of work, commits on
 * success, and rolls back on any thrown error.
 */
export const withTransaction = async <T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection closed');
  }
};