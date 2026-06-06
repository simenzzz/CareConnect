import { Pool } from 'pg';
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