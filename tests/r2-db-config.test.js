import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { postgresConnectionOptions } from '../server/postgres-config.js';

const URL_BASE = 'postgresql://pcw_runtime:synthetic-password@pooler.example.invalid:6543/postgres';
const CA = 'synthetic-test-ca-not-a-real-certificate';
const parameters = (url, options = {}) => new pg.Client(postgresConnectionOptions(url, options)).connectionParameters;

test('actual pg.Client preserves strict remote TLS and supplied CA for common Supabase sslmode=require', () => {
  const actual = parameters(URL_BASE + '?sslmode=require', { ca: CA });
  assert.equal(actual.ssl.rejectUnauthorized, true);
  assert.equal(actual.ssl.ca, CA);
  assert.equal(actual.ssl.checkServerIdentity, undefined);
  assert.equal(actual.host, 'pooler.example.invalid');
  assert.equal(actual.port, 6543);
});

test('actual pg.Client keeps strict remote TLS for absent, verify-ca and verify-full URL modes', () => {
  for (const suffix of ['', '?sslmode=verify-ca', '?sslmode=verify-full']) {
    const actual = parameters(URL_BASE + suffix, { ca: CA });
    assert.deepEqual(actual.ssl, { rejectUnauthorized: true, ca: CA });
  }
});

test('URL options cannot disable TLS, replace CA, enable libpq downgrade or make pg read arbitrary certificate files', () => {
  for (const query of ['sslmode=disable', 'sslmode=no-verify', 'sslmode=prefer', 'uselibpqcompat=true&sslmode=require', 'ssl=false', 'sslrootcert=/tmp/not-authorized', 'sslcert=/tmp/not-authorized', 'sslkey=/tmp/not-authorized', 'sslmode=require&sslmode=disable', 'host=other.example.invalid', 'options=-c%20role%3Dpostgres']) {
    assert.throws(() => parameters(URL_BASE + '?' + query, { ca: CA }), error => error.code === 'DATABASE_CONFIG_INVALID' && !JSON.stringify(error).includes('synthetic-password') && !error.message.includes('not-authorized'));
  }
});

test('only explicit loopback database hosts default to no TLS; IPv6 is normalized for actual pg.Client', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const actual = parameters('postgresql://test@' + host + '/testdb');
    assert.equal(actual.ssl, false);
  }
  assert.equal(parameters('postgresql://test@[::1]/testdb').host, '::1');
  assert.equal(parameters('postgresql://test@localhost/testdb?sslmode=disable').ssl, false);
  assert.equal(parameters('postgresql://test@localhost/testdb?sslmode=require', { ca: CA }).ssl.rejectUnauthorized, true);
  assert.equal(parameters('postgresql://test:synthetic@localhost.example.invalid/testdb').ssl.rejectUnauthorized, true);
});

test('actual pg.Client receives decoded credentials and database fields without the original connection string', () => {
  const actual = parameters('postgresql://pcw_runtime.project:synthetic%40password%3A42@pooler.example.invalid/custom_db?sslmode=require');
  assert.equal(actual.user, 'pcw_runtime.project');
  assert.equal(actual.password, 'synthetic@password:42');
  assert.equal(actual.database, 'custom_db');
  assert.equal(actual.port, 5432);
  assert.equal(postgresConnectionOptions(URL_BASE).connectionString, undefined);
});

test('malformed or ambiguous database URLs fail safely before any network connection', () => {
  for (const url of ['https://secret@db.example.invalid/postgres', 'postgresql://pcw_runtime@db.example.invalid/postgres', 'postgresql://a:secret@db.example.invalid/', 'postgresql://a:secret@db.example.invalid/db#secret', 'postgresql://a:secret@db.example.invalid/db%2Fother', 'postgresql://a:secret@db.example.invalid:99999/db', 'postgresql://a:secret%ZZ@db.example.invalid/db']) {
    assert.throws(() => parameters(url), error => error.code === 'DATABASE_CONFIG_INVALID' && !error.message.includes('secret') && !JSON.stringify(error).includes(url));
  }
});
