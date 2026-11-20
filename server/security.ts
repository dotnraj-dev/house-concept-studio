import type {FastifyInstance, FastifyReply} from 'fastify';
import {scryptSync, randomBytes} from 'node:crypto';

/**
 * Security hardening shared by all routes (see SECURITY-REVIEW.md).
 * - Response headers: CSP, HSTS (production), Permissions-Policy, COOP, CORP.
 * - In-memory fixed-window rate limits for login (per IP and per account) and paid/external APIs (per user).
 */

const isProduction = () => process.env.NODE_ENV === 'production';

/** Hosts the browser legitimately loads from: Google Fonts, Pixabay previews, drei's Draco decoder on gstatic. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://cdn.pixabay.com https://pixabay.com",
  "media-src 'self' blob:",
  "connect-src 'self' blob: data: https://www.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(reply: FastifyReply) {
  reply.header('X-Content-Type-Options', 'nosniff')
    .header('X-Frame-Options', 'DENY')
    .header('Referrer-Policy', 'same-origin')
    .header('Content-Security-Policy', CONTENT_SECURITY_POLICY)
    .header('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()')
    .header('Cross-Origin-Opener-Policy', 'same-origin')
    .header('Cross-Origin-Resource-Policy', 'same-origin');
  if (isProduction()) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

type Window = {count: number; resetAt: number};
const MAX_KEYS = 20_000;

/** Fixed-window limiter. Bounded memory: expired windows are pruned and the map is capped. */
export class RateLimiter {
  private windows = new Map<string, Window>();
  constructor(readonly limit: number, readonly windowMs: number) {}

  /** Records one attempt; returns seconds to wait when over the limit, otherwise 0. */
  hit(key: string, now = Date.now()): number {
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      if (this.windows.size >= MAX_KEYS) this.prune(now);
      this.windows.set(key, {count: 1, resetAt: now + this.windowMs});
      return 0;
    }
    w.count++;
    return w.count > this.limit ? Math.ceil((w.resetAt - now) / 1000) : 0;
  }

  blocked(key: string, now = Date.now()): number {
    const w = this.windows.get(key);
    return w && w.resetAt > now && w.count >= this.limit ? Math.ceil((w.resetAt - now) / 1000) : 0;
  }

  reset(key: string) { this.windows.delete(key); }

  get size() { return this.windows.size; }

  prune(now = Date.now()) {
    for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
    if (this.windows.size >= MAX_KEYS) this.windows.clear();
  }
}

export const loginByIp = new RateLimiter(20, 15 * 60_000);
export const loginByAccount = new RateLimiter(8, 15 * 60_000);
/** Paid or third-party calls per signed-in user per hour. */
export const externalApi = new RateLimiter(60, 60 * 60_000);

export function tooMany(reply: FastifyReply, seconds: number, message = 'Too many attempts. Try again later.') {
  return reply.code(429).header('Retry-After', String(seconds)).send({error: message});
}

/** Burns the same scrypt cost as a real check so unknown accounts are not distinguishable by timing. */
const dummySalt = randomBytes(16).toString('hex');
export function equaliseLoginTiming(password: string) { scryptSync(password, dummySalt, 64); }

export function registerSecurity(app: FastifyInstance<any, any, any, any, any>) {
  app.addHook('onSend', async (_request, reply, payload) => { securityHeaders(reply); return payload; });
}

/** Behind Render/most PaaS a single proxy hop sets X-Forwarded-For; trust exactly that many hops. */
export function trustProxySetting(): ((address: string, hop: number) => boolean) | false {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? (isProduction() ? 1 : 0));
  return Number.isInteger(hops) && hops > 0 ? (_address, hop) => hop < hops : false;
}
