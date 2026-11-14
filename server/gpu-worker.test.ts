import test from 'node:test';
import assert from 'node:assert/strict';
import {workerBaseUrl,isPrivateAddress} from './gpu-worker';
import {renderOptionsSchema,computeRenderCost} from '../src/rendering';

test('GPU worker connections allow the documented SSH tunnel and public HTTPS only',()=>{
 assert.equal(workerBaseUrl('http://127.0.0.1:8787'),'http://127.0.0.1:8787');
 assert.equal(workerBaseUrl('https://render.example.com/'),'https://render.example.com');
 for(const value of ['http://render.example.com','http://127.0.0.1:5434','https://user:pass@render.example.com','https://render.example.com/jobs','https://169.254.169.254','https://[::1]','https://10.1.2.3'])assert.throws(()=>workerBaseUrl(value),value);
 for(const value of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','::ffff:127.0.0.1','fd00::1'])assert.equal(isPrivateAddress(value),true,value);
 assert.equal(isPrivateAddress('8.8.8.8'),false);
});
test('render contract validates camera orientation and bounds costly rendering settings',()=>{
 const valid={requestId:'0667be16-2ea4-4de3-a45c-2660598f407d',provider:'gpu-worker',camera:{position:[1,5,10],quaternion:[0,0,0,1],fov:52},width:3840,samples:512};
 assert.equal(renderOptionsSchema.parse(valid).width,3840);
 for(const edit of [{width:16000},{samples:100000},{provider:'unknown'},{camera:{...valid.camera,quaternion:[0,0,0,0]}},{camera:{...valid.camera,position:[NaN,2,3]}}])assert.equal(renderOptionsSchema.safeParse({...valid,...edit}).success,false);
 assert.equal(computeRenderCost(600,59.32),9.89);
});
