import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool, sql } from '../server/db';
import { DEFAULT_RATIOS, DEFAULT_REQUIREMENTS } from '../src/types';

const base = 'http://127.0.0.1:5173/api';
let projectId = '';
let employeeId = '';

async function request(path: string, cookie = '', method = 'GET', body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json() as Record<string, any>;
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' };
}

try {
  const admin = await request('/login', '', 'POST', { email:process.env.ADMIN_EMAIL, password:process.env.ADMIN_PASSWORD });
  assert.equal(admin.status, 200, `Admin login failed: ${JSON.stringify(admin.data)}`);
  const adminCookie = admin.cookie;
  assert.ok(adminCookie);
  assert.equal((await request('/me', adminCookie)).data.user.role, 'admin');
  assert.equal((await request('/settings', adminCookie)).status, 200);

  const now = new Date().toISOString();
  const draft = { title:'Local smoke concept', requirements:DEFAULT_REQUIREMENTS, paragraph:'', transcript:'',
    selectedVariant:0, ratios:DEFAULT_RATIOS, status:'concept', createdAt:now, updatedAt:now };
  const created = await request('/projects', adminCookie, 'POST', draft);
  assert.equal(created.status, 201, `Create project failed: ${JSON.stringify(created.data)}`);
  projectId = created.data.project.id;
  const edited = await request(`/projects/${projectId}`, adminCookie, 'PATCH', { ...draft, title:'Local smoke concept updated' });
  assert.equal(edited.status, 200);
  assert.ok((await request('/projects', adminCookie)).data.projects.some((project: {id:string}) => project.id === projectId));

  const email = `smoke-${randomUUID()}@local.test`;
  const employee = await request('/users', adminCookie, 'POST', { name:'Local smoke employee', email,
    password:'LocalSmoke2026!Password', permissions:['projects.view'] });
  assert.equal(employee.status, 201, `Create employee failed: ${JSON.stringify(employee.data)}`);
  employeeId = employee.data.user.id;
  const employeeLogin = await request('/login', '', 'POST', { email, password:'LocalSmoke2026!Password' });
  assert.equal(employeeLogin.status, 200);
  const employeeCookie = employeeLogin.cookie;
  assert.equal((await request('/projects', employeeCookie)).status, 200);
  assert.equal((await request('/users', employeeCookie)).status, 403);

  const disabled = await request(`/users/${employeeId}`, adminCookie, 'PATCH', {
    name:'Local smoke employee', active:true, permissions:[],
  });
  assert.equal(disabled.status, 200);
  assert.equal((await request('/projects', employeeCookie)).status, 403);
  console.log('Local smoke passed: admin login, project create/edit, employee account and live permission toggles.');
} finally {
  if (projectId) await sql('DELETE FROM projects WHERE id=$1', [projectId]);
  if (employeeId) await sql('DELETE FROM users WHERE id=$1', [employeeId]);
  await pool.end();
}
