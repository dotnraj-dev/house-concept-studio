import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sql,pool} from '../server/db';
import {DEFAULT_REQUIREMENTS,DEFAULT_RATIOS,designOf} from '../src/types';
const base='http://127.0.0.1:5173/api';let projectId='',employeeId='',providerBefore:any[]=[],providerTouched=false;
async function request(url:string,cookie='',method='GET',body?:unknown){const r=await fetch(base+url,{method,headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
try{
 const login=await request('/login','','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200);const admin=login.cookie;
 const parsed=await request('/extract',admin,'POST',{text:'Plot 40 x 60, G+3, 6 bedrooms. Door east. Kerala style.'});assert.equal(parsed.status,200);assert.equal(parsed.data.mode,'local');assert.ok(parsed.data.fields.some((f:any)=>f.key==='floors'&&f.value==='4'));
 const draft={title:'V2 integration check',requirements:{...DEFAULT_REQUIREMENTS,floors:4,bedrooms:6,design:{...designOf(DEFAULT_REQUIREMENTS),customerEmail:'customer@local.test',mainDoorFacing:'east',twoDoors:true,outerFacing:'north'}},paragraph:'Keep original conversation',transcript:'Tamil / English transcript',selectedVariant:0,ratios:DEFAULT_RATIOS,status:'concept'};
 const create=await request('/projects',admin,'POST',draft);assert.equal(create.status,201);projectId=create.data.project.id;assert.equal(create.data.project.requirements.design.mainDoorFacing,'east');assert.equal(create.data.project.requirements.floors,4);
 const email=`v2-${randomUUID()}@local.test`,newUser=await request('/users',admin,'POST',{name:'Permission check',email,password:'TemporaryTesting2026!',permissions:['projects.view','projects.create','projects.edit','intake.ai']});assert.equal(newUser.status,201);employeeId=newUser.data.user.id;
 const employee=(await request('/login','','POST',{email,password:'TemporaryTesting2026!'})).cookie;
 const serviceReq={...draft.requirements,design:{...draft.requirements.design,services:[{id:'tank',type:'tank',label:'Storage',x:1,y:1,level:4,capacity:1000,side:'north',locked:true}]}};
 assert.equal((await request(`/projects/${projectId}`,employee,'PATCH',{...draft,requirements:serviceReq})).status,403);
 assert.equal((await request('/projects',employee,'POST',{...draft,requirements:serviceReq})).status,403);
 const quoteReq={...draft.requirements,design:{...draft.requirements.design,quoteOverride:true,quoteRate:2500}};
 assert.equal((await request(`/projects/${projectId}`,employee,'PATCH',{...draft,requirements:quoteReq})).status,403);
 assert.equal((await request('/projects',employee,'POST',{...draft,requirements:quoteReq})).status,403);
 assert.equal((await request('/integrations/openai',employee,'PATCH',{apiKey:'never-used-test-key'})).status,403);
 assert.equal((await request(`/projects/${projectId}/renders`,employee)).status,403);
 assert.equal((await request(`/projects/${projectId}`,admin,'PATCH',{...draft,requirements:{...draft.requirements,plotWidth:2},status:'approved'})).status,400);
 assert.equal((await request(`/projects/${projectId}`,admin,'PATCH',{...draft,requirements:{...draft.requirements,floors:0}})).status,400);
 providerBefore=(await sql('SELECT * FROM provider_credentials WHERE provider=$1',['openai'])).rows;
 providerTouched=true;const fake='never-used-v2-check-'+randomUUID();const saved=await request('/integrations/openai',admin,'PATCH',{apiKey:fake,textModel:'gpt-6.1-sol',speechModel:'gpt-transcribe'});assert.equal(saved.status,200);assert.equal(JSON.stringify(saved.data).includes(fake),false);
 const status=await request('/integrations/status',employee);assert.equal(status.data.openai.configured,true);assert.equal(JSON.stringify(status.data).includes(fake),false);
 const stored=(await sql('SELECT encrypted FROM provider_credentials WHERE provider=$1',['openai'])).rows[0].encrypted;assert.equal(stored.includes(fake),false);
 const normalSettings=await request('/settings',admin);assert.equal(JSON.stringify(normalSettings.data).includes(fake),false);
 await request('/integrations/openai',admin,'DELETE');assert.equal((await sql('SELECT encrypted FROM provider_credentials WHERE provider=$1',['openai'])).rowCount,0);
 const removed=await request('/projects',admin);assert.ok(removed.data.projects.some((p:any)=>p.id===projectId&&p.requirements.design.twoDoors));
 const env=await fetch('http://127.0.0.1:5173/.secrets/credentials.key');assert.equal(env.status,403);
 console.log('V2 integration passed: local extraction, four-floor persistence, 2-door brief, invalid input rejection, protected services/quotes/renders, encrypted credential save/remove and masked responses. No paid API calls were made.');
}finally{
 if(providerTouched){await sql('DELETE FROM provider_credentials WHERE provider=$1',['openai']);for(const row of providerBefore)await sql('INSERT INTO provider_credentials(provider,encrypted,updated_at) VALUES($1,$2,$3)',[row.provider,row.encrypted,row.updated_at]);}
 if(projectId)await sql('DELETE FROM projects WHERE id=$1',[projectId]);if(employeeId){await sql('DELETE FROM projects WHERE owner_id=$1',[employeeId]);await sql('DELETE FROM users WHERE id=$1',[employeeId]);}await pool.end();
}
