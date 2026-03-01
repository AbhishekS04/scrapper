import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema.js';

let _db = null;
let _sql = null;

function init() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
    _db = drizzle(_sql, { schema });
  }
  return { db: _db, sql: _sql };
}

export const db = new Proxy({}, {
  get(_, prop) {
    return init().db[prop];
  }
});

export const sql = new Proxy(function(){}, {
  apply(_, thisArg, args) {
    return init().sql(...args);
  },
  get(_, prop) {
    return init().sql[prop];
  }
});
