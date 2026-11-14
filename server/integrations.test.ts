import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {seal,unseal} from './integrations';
import {validateRenderGlb} from './renders';
test('provider credentials encrypt with random nonces and detect tampering',()=>{const key=randomBytes(32),plain=JSON.stringify({apiKey:'test-secret'}),a=seal(plain,key),b=seal(plain,key);assert.notEqual(a,b);assert.equal(a.includes('test-secret'),false);assert.equal(unseal(a,key),plain);assert.throws(()=>unseal(a,randomBytes(32)));const parts=a.split('.');parts[2]=Buffer.from('tampered').toString('base64');assert.throws(()=>unseal(parts.join('.'),key));});
test('render scenes reject malformed headers and external texture URLs',()=>{assert.throws(()=>validateRenderGlb(Buffer.from('not a model')));const make=(manifest:unknown)=>{const json=Buffer.from(JSON.stringify(manifest)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),b=Buffer.alloc(20+padded.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(padded.length,12);b.write('JSON',16);padded.copy(b,20);return b;};assert.equal(validateRenderGlb(make({asset:{version:'2.0'},nodes:[]})),true);assert.throws(()=>validateRenderGlb(make({images:[{uri:'file:///etc/passwd'}]})));assert.throws(()=>validateRenderGlb(make({buffers:[{uri:'https://example.com/model.bin'}]})));});
