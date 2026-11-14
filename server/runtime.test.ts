import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {credentialKey,storagePaths,validRequestOrigin,validateHostingEnvironment} from './runtime';

test('all writable application data shares the configured persistent mount',()=>{
  const paths=storagePaths({DATA_DIR:path.resolve('persistent-test')});
  for(const value of Object.values(paths))assert.equal(path.relative(path.resolve('persistent-test'),value).startsWith('..'),false);
  assert.equal(storagePaths({DATA_DIR:'data',UPLOAD_DIR:'other-uploads'}).uploads,path.resolve('other-uploads'));
});
test('hosting refuses ephemeral credentials and accepts stable Render-generated keys',()=>{
  const key=randomBytes(32),env={NODE_ENV:'production',DATABASE_URL:'postgres://example',RENDER:'true',DATA_DIR:'data',CREDENTIAL_ENCRYPTION_KEY:key.toString('hex')};
  assert.deepEqual(credentialKey(key.toString('base64')),key);
  assert.deepEqual(credentialKey(key.toString('hex')),key);
  assert.throws(()=>validateHostingEnvironment({...env,DATA_DIR:undefined}),/persistent disk/);
  assert.throws(()=>validateHostingEnvironment({...env,CREDENTIAL_ENCRYPTION_KEY:undefined}),/stable/);
  assert.throws(()=>credentialKey('wrong'));
  assert.doesNotThrow(()=>validateHostingEnvironment(env));
  assert.doesNotThrow(()=>validateHostingEnvironment({...env,DATA_DIR:undefined,FILE_STORAGE:'database'}));
});
test('hosted browser mutations accept the configured origin and reject malformed or foreign origins',()=>{
  const env={RENDER_EXTERNAL_URL:'https://house-studio.onrender.com'};
  assert.equal(validRequestOrigin('https://house-studio.onrender.com','proxy.internal',env),true);
  assert.equal(validRequestOrigin('https://evil.example','house-studio.onrender.com',env),false);
  assert.equal(validRequestOrigin('null','house-studio.onrender.com',env),false);
  assert.equal(validRequestOrigin('broken url','house-studio.onrender.com',env),false);
  assert.equal(validRequestOrigin('http://127.0.0.1:5173','127.0.0.1:5173',{}),true);
});
