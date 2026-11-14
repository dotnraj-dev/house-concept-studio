import pg from 'pg';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DEFAULT_SETTINGS } from '../src/types';
import {DEFAULT_RATIOS} from '../src/types';
import {SHOWCASE_REQUIREMENTS} from '../src/showcase';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || undefined, max: 8 });
export const sql = (text: string, values?: unknown[]) => pool.query(text, values);

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function initializeDatabase() {
  await sql(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('admin','employee')),
      active boolean NOT NULL DEFAULT true, permissions jsonb NOT NULL DEFAULT '[]',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id),
      title text NOT NULL, requirements jsonb NOT NULL, paragraph text NOT NULL DEFAULT '',
      transcript text NOT NULL DEFAULT '', selected_variant integer NOT NULL DEFAULT 0,
      ratios jsonb NOT NULL, status text NOT NULL DEFAULT 'concept',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS assets (
      id uuid PRIMARY KEY, name text NOT NULL, category text NOT NULL,
      width real NOT NULL, depth real NOT NULL, height real NOT NULL,
      license text NOT NULL, source text NOT NULL DEFAULT '', file_path text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK (id=1), data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS stored_files (key text PRIMARY KEY, content bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS provider_credentials (provider text PRIMARY KEY, encrypted text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS render_jobs (
      id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
      status text NOT NULL, endpoint_id text NOT NULL, remote_id text, input_token text NOT NULL, input_expires timestamptz NOT NULL,
      message text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,request_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_render_per_project ON render_jobs(project_id) WHERE status IN ('SUBMITTING','IN_QUEUE','IN_PROGRESS','SUBMISSION_UNKNOWN');
    ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'runpod';
    ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS elapsed_seconds real;
    ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS hourly_rate_inr real;
    INSERT INTO settings (id, data) VALUES (1, '${JSON.stringify(DEFAULT_SETTINGS)}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    CREATE INDEX IF NOT EXISTS projects_updated_idx ON projects (updated_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
  `);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in .env');
  }
  const existing = await sql('SELECT id FROM users WHERE role=$1 LIMIT 1', ['admin']);
  if (!existing.rowCount) {
    const { randomUUID } = await import('node:crypto');
    await sql('INSERT INTO users(id,name,email,password_hash,role,permissions) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), 'Administrator', adminEmail, hashPassword(adminPassword), 'admin', '[]']);
    console.log(`Created initial admin account: ${adminEmail}`);
  }
  if(process.env.SEED_SHOWCASE==='true'){
    const count=await sql('SELECT count(*)::int AS count FROM projects');
    if(count.rows[0].count===0){
      const {randomUUID}=await import('node:crypto');
      const owner=await sql("SELECT id FROM users WHERE role='admin' LIMIT 1");
      await sql('INSERT INTO projects(id,owner_id,title,requirements,paragraph,transcript,selected_variant,ratios,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [randomUUID(),owner.rows[0].id,'Thendral Residence — showcase',SHOWCASE_REQUIREMENTS,'','',1,DEFAULT_RATIOS,'concept']);
    }
  }
}
