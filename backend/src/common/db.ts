import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const poolConfig: PoolConfig = {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    if (connectionString) {
      poolConfig.connectionString = connectionString;
    } else {
      poolConfig.host = process.env.DB_HOST || 'localhost';
      poolConfig.port = parseInt(process.env.DB_PORT || '5432');
      poolConfig.database = process.env.DB_NAME || 'mmt_care_connect';
      poolConfig.user = process.env.DB_USER || 'postgres';
      poolConfig.password = process.env.DB_PASS || 'postgres';
    }

    if (process.env.DB_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolConfig);
    pool.on('error', (err: Error) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const db = getPool();
  const { rows } = await db.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

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
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
