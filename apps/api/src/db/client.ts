import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { Pool, type PoolClient } from 'pg';

export type QueryResult<Row> = {
  rows: Row[];
  rowCount: number;
};

export interface Database {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  transaction<Result>(work: (database: Database) => Promise<Result>): Promise<Result>;
  close(): Promise<void>;
}

type DatabaseOptions = {
  databaseUrl?: string;
  dataDir?: string;
};

function pgliteDatabase(client: PGlite, ownsClient: boolean): Database {
  return {
    async query<Row extends Record<string, unknown>>(sql: string, params = []) {
      if (params.length === 0 && sql.includes(';')) {
        const results = await client.exec(sql);
        const result = results.at(-1);
        return {
          rows: (result?.rows ?? []) as Row[],
          rowCount: result?.affectedRows ?? result?.rows.length ?? 0,
        };
      }
      const result = await client.query<Row>(sql, [...params]);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
    async transaction<Result>(work: (database: Database) => Promise<Result>) {
      return client.transaction(async (transaction) => {
        const transactionDatabase: Database = {
          async query<Row extends Record<string, unknown>>(sql: string, params = []) {
            if (params.length === 0 && sql.includes(';')) {
              const results = await transaction.exec(sql);
              const result = results.at(-1);
              return {
                rows: (result?.rows ?? []) as Row[],
                rowCount: result?.affectedRows ?? result?.rows.length ?? 0,
              };
            }
            const result = await transaction.query<Row>(sql, [...params]);
            return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
          },
          async transaction<NestedResult>(
            nestedWork: (database: Database) => Promise<NestedResult>,
          ) {
            return nestedWork(transactionDatabase);
          },
          async close() {},
        };
        return work(transactionDatabase);
      });
    },
    async close() {
      if (ownsClient) await client.close();
    },
  };
}

function postgresTransaction(client: PoolClient): Database {
  return {
    async query<Row extends Record<string, unknown>>(sql: string, params = []) {
      const result = await client.query<Row>(sql, [...params]);
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    },
    async transaction<Result>(work: (database: Database) => Promise<Result>) {
      return work(postgresTransaction(client));
    },
    async close() {},
  };
}

export async function createDatabase(options: DatabaseOptions = {}): Promise<Database> {
  if (!options.databaseUrl) {
    const dataDir = options.dataDir ?? 'memory://';
    if (dataDir && !dataDir.startsWith('memory://')) {
      mkdirSync(dataDir, { recursive: true });
    }
    const client = new PGlite(dataDir);
    await client.waitReady;
    return pgliteDatabase(client, true);
  }

  const pool = new Pool({
    connectionString: options.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  await pool.query('SELECT 1');

  return {
    async query<Row extends Record<string, unknown>>(sql: string, params = []) {
      const result = await pool.query<Row>(sql, [...params]);
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    },
    async transaction<Result>(work: (database: Database) => Promise<Result>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(postgresTransaction(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
