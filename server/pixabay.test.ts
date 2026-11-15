import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceCacheKey,fetchReferencePhotos,referencePhotos,referenceQuery} from './pixabay';
test('reference search normalises input and rejects empty or oversized searches',()=>{assert.equal(referenceQuery('  Kerala   house  '),'Kerala house');assert.throws(()=>referenceQuery(' '));assert.throws(()=>referenceQuery('x'.repeat(101)));});
test('reference results exclude unsafe links and never expose upstream fields',()=>{
 const hits=[{id:3,pageURL:'https://pixabay.com/photos/house-3/',webformatURL:'https://cdn.pixabay.com/photo/house.jpg',user:'Architect',tags:'house',key:'secret',imageURL:'https://evil.invalid/leak'}];
 const result=referencePhotos({hits});assert.equal(result.length,1);assert.equal(JSON.stringify(result).includes('secret'),false);
 assert.equal(referencePhotos({hits:[{...hits[0],webformatURL:'https://pixabay.com.evil.invalid/house'}]}).length,0);
 assert.equal(referencePhotos({hits:[{...hits[0],pageURL:'javascript:alert(1)'}]}).length,0);
});
test('upstream errors cannot echo credentials through application error messages',async()=>{
 const key='private-test-secret';
 await assert.rejects(fetchReferencePhotos('kitchen',key,async()=>{throw new Error('failed URL ?key='+key);}),e=>e instanceof Error&&!e.message.includes(key));
 await assert.rejects(fetchReferencePhotos('kitchen',key,async()=>new Response(key,{status:401})),e=>e instanceof Error&&!e.message.includes(key));
});
test('Pixabay requests use a fixed host and bounded photo results',async()=>{
 let sent:URL|undefined;const request:typeof fetch=async input=>{sent=new URL(String(input));return new Response(JSON.stringify({total:1,hits:[]}));};
 const r=await fetchReferencePhotos('Kerala house','secret',request);assert.equal(r.total,1);assert.equal(sent!.origin,'https://pixabay.com');assert.equal(sent!.searchParams.get('safesearch'),'true');assert.equal(sent!.searchParams.get('per_page'),'12');
});


test('reference cache isolation checks a replacement key instead of validating it with older-key results',()=>{const a=referenceCacheKey('Living room','old-secret'),b=referenceCacheKey('living room','new-secret');assert.notEqual(a,b);assert.equal(a,referenceCacheKey('living room','old-secret'));assert.equal(a.includes('old-secret'),false);});
