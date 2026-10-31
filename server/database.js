import pg from 'pg';
import { Store } from './store.js';
import { HttpError } from './security.js';
let singleton;
export function database(config) {
  if (!config.databaseUrl) throw new HttpError(503,'DATABASE_REQUIRED','工作台数据库尚未配置');
  if (!singleton) {
    const local = ['localhost','127.0.0.1','::1'].includes(new URL(config.databaseUrl).hostname);
    const pool = new pg.Pool({ connectionString:config.databaseUrl, max:3, idleTimeoutMillis:15000, connectionTimeoutMillis:10000, statement_timeout:15000, ssl:local?false:{rejectUnauthorized:true,...(config.databaseCa?{ca:config.databaseCa}:{})} });
    pool.on('error',()=>{}); // Never log a connection URL or credential.
    singleton=new Store(pool);
  }
  return singleton;
}
