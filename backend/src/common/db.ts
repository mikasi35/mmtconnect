import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;

/**
 * Singleton pool using DATABASE_URL only
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    const poolConfig: PoolConfig = {
      connectionString,

      // 🔥 IMPORTANT for Supabase session pooler
      ssl: { rejectUnauthorized: false },

      // 🔥 Safe limits for session pooler (prevents overload)
      max: parseInt(process.env.DB_POOL_MAX || '5'),
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,

      // Helps reduce dropped idle connections
      keepAlive: true,
    };

    pool = new Pool(poolConfig);

    /**
     * Handle unexpected pool-level errors
     * and allow automatic recovery
     */
    pool.on('error', (err: Error) => {
      console.error('🔥 PostgreSQL pool error:', err);

      // Reset pool so next request rebuilds it cleanly
      pool = null;
    });
  }

  return pool;
}

/**
 * Query with lightweight retry (safe for transient Supabase drops)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError: any;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // exponential backoff (small, avoids compounding latency)
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }

  throw lastError;
}

/**
 * Run SQL query
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const db = getPool();

  const result = await withRetry(() =>
    db.query(sql, params)
  );

  return result.rows as T[];
}

/**
 * Return single row
 */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Transaction helper (safe + pooled client handling)
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const result = await fn(client);

    await client.query('COMMIT');
    return result;

  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('⚠️ Rollback failed:', rollbackErr);
    }

    throw err;

  } finally {
    try {
      client.release();
    } catch (err) {
      console.error('⚠️ Client release failed:', err);
    }
  }
}