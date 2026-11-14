import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sql } from './db';
import { FEATURES, type Feature, type User } from '../src/types';

const SESSION_DAYS = 7;
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export function setSessionCookie(reply: FastifyReply, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  reply.header('Set-Cookie', `hcs_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
export function clearSessionCookie(reply: FastifyReply) {
  reply.header('Set-Cookie', `hcs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}
export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  await sql('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval \'7 days\')', [digest(token), userId]);
  return token;
}
export function readToken(request: FastifyRequest): string | undefined {
  const cookie = request.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('hcs_session='));
  return cookie?.slice('hcs_session='.length);
}
export async function currentUser(request: FastifyRequest): Promise<User | null> {
  const token = readToken(request);
  if (!token) return null;
  const result = await sql(`SELECT u.id,u.name,u.email,u.role,u.active,u.permissions
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`, [digest(token)]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return { id: row.id, name: row.name, email: row.email, role: row.role, active: row.active,
    permissions: (row.permissions as Feature[]).filter(p => FEATURES.includes(p)) };
}
export function can(user: User, feature: Feature): boolean {
  return user.role === 'admin' || user.permissions.includes(feature);
}
export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
  const user = await currentUser(request);
  if (!user) reply.code(401).send({ error: 'Sign in to continue.' });
  return user;
}
export function requireFeature(user: User, feature: Feature, reply: FastifyReply): boolean {
  if (can(user, feature)) return true;
  reply.code(403).send({ error: `Access to ${feature} is disabled for this account.` });
  return false;
}
