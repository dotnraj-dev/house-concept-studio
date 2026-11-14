import assert from 'node:assert/strict';
import test from 'node:test';
import { can } from './auth';
import { checkPassword, hashPassword } from './db';
import type { User } from '../src/types';

const employee: User = { id:'employee', name:'Employee', email:'employee@example.com', role:'employee', active:true, permissions:['projects.create'] };

test('employee access follows individual feature toggles; admin has full access', () => {
  assert.equal(can(employee, 'projects.create'), true);
  assert.equal(can(employee, 'projects.view'), false);
  assert.equal(can(employee, 'assets.manage'), false);
  assert.equal(can({ ...employee, role:'admin', permissions:[] }, 'assets.manage'), true);
});

test('password hashes verify the password without storing it directly', () => {
  const hash = hashPassword('a sufficiently long password');
  assert.equal(hash.includes('a sufficiently long password'), false);
  assert.equal(checkPassword('a sufficiently long password', hash), true);
  assert.equal(checkPassword('different password', hash), false);
});
