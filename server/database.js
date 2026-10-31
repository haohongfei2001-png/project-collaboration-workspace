import pg from 'pg';
import { Store } from './store.js';
import { HttpError } from './security.js';
import { postgresConnectionOptions } from './postgres-config.js';
let singleton;
export function database(config) {
  if (!config.databaseUrl) throw new HttpError(503,'DATABASE_REQUIRED','工作台数据库尚未配置');
  if (!singleton) {
    const pool = new pg.Pool({ ...postgresConnectionOptions(config.databaseUrl,{ca:config.databaseCa||''}), max:3, idleTimeoutMillis:15000, connectionTimeoutMillis:10000, statement_timeout:15000 });
    pool.on('error',()=>{}); // Never log a connection URL or credential.
    singleton=new Store(pool);
  }
  return singleton;
}
