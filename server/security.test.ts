import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {CONTENT_SECURITY_POLICY, RateLimiter, registerSecurity, trustProxySetting} from './security';

test('rate limiter blocks after the limit and recovers after the window', () => {
  const limiter = new RateLimiter(3, 1000);
  for (let i = 0; i < 3; i++) assert.equal(limiter.hit('a', 0), 0);
  assert.ok(limiter.hit('a', 10) > 0, 'fourth attempt is blocked');
  assert.ok(limiter.blocked('a', 10) > 0);
  assert.equal(limiter.blocked('b', 10), 0, 'other keys are independent');
  assert.equal(limiter.hit('a', 1001), 0, 'new window after expiry');
});

test('rate limiter memory is bounded', () => {
  const limiter = new RateLimiter(1, 1000);
  for (let i = 0; i < 20_500; i++) limiter.hit(`k${i}`, 0);
  assert.ok(limiter.size <= 20_000);
});

test('every response carries the security headers', async () => {
  const app = Fastify();
  registerSecurity(app);
  app.get('/x', async () => ({ok: true}));
  const res = await app.inject({method: 'GET', url: '/x'});
  assert.equal(res.headers['content-security-policy'], CONTENT_SECURITY_POLICY);
  assert.equal(res.headers['x-frame-options'], 'DENY');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(String(res.headers['permissions-policy']), /microphone=\(self\)/);
  assert.equal(res.headers['cross-origin-opener-policy'], 'same-origin');
  await app.close();
});

test('CSP forbids framing, plugins and foreign scripts', () => {
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /script-src[^;]*'unsafe-eval'/);
});

test('proxy trust: one hop in production, none in development, configurable', () => {
  const env = {...process.env};
  try {
    process.env.NODE_ENV = 'production'; delete process.env.TRUST_PROXY_HOPS;
    const prod = trustProxySetting();
    assert.ok(prod && prod('10.0.0.1', 0) && !prod('10.0.0.1', 1));
    process.env.NODE_ENV = 'development';
    assert.equal(trustProxySetting(), false);
    process.env.TRUST_PROXY_HOPS = '2';
    const two = trustProxySetting();
    assert.ok(two && two('x', 1) && !two('x', 2));
  } finally { process.env = env; }
});
