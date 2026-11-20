const fs=require('node:fs'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
const out='docs/screenshots/workspace/';fs.mkdirSync(out,{recursive:true});
const fixture=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
const url=process.env.WORKSPACE_DEMO_URL||'http://127.0.0.1:5251';
const touchOnly=process.argv.includes('--touch-only');
const evidence=touchOnly?JSON.parse(fs.readFileSync(out+'verification.json','utf8')):{viewports:[],compass:[],touch:[],performance:{},errors:[]};
if(touchOnly){evidence.viewports=evidence.viewports.filter(v=>!v.file.includes('ipad')&&!v.file.includes('phone'));evidence.touch=[];}
async function shot(page,file){await page.screenshot({path:out+file,timeout:180000});const info=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],pageWidth:document.documentElement.scrollWidth,canvas:(()=>{const r=document.querySelector('canvas')?.getBoundingClientRect();return r?{width:r.width,height:r.height}:null;})()}));assert.ok(info.pageWidth<=info.viewport[0]+1,'No horizontal page overflow');evidence.viewports.push({file,...info});console.log('Saved',file);}
async function ready(page){await page.locator('canvas').waitFor({timeout:240000});await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});await page.waitForTimeout(1800);}
async function mode(page,m){if(await page.locator('.mobile-mode').isVisible())await page.getByLabel('Workspace mode',{exact:true}).selectOption(m);else await page.locator('.workspace-modes').getByRole('button',{name:{brief:'Brief',plan:'2D',model:'3D',present:'Present',proposal:'Proposal'}[m],exact:true}).click();}
async function heading(page){return +await page.locator('.house-canvas .compass').getAttribute('data-heading');}
async function bench(page){return page.evaluate(async()=>{const v=window.__hcsDemoViewer,times=[];let last=performance.now(),start=last;await new Promise(resolve=>{function tick(now){times.push(now-last);last=now;v.invalidate();if(now-start<6000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});return +(1000/(times.slice(5).reduce((a,b)=>a+b,0)/times.slice(5).length)).toFixed(1);});}
async function seed(context){await context.addInitScript(v=>{if(!sessionStorage.getItem('workspace-fixture')){localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([v]));localStorage.setItem('hcs_last_project',v.id);sessionStorage.setItem('workspace-fixture','true');}},fixture);}
function listen(page){page.setDefaultTimeout(180000);page.on('pageerror',e=>{evidence.errors.push(e.message);console.log('PAGE ERROR',e.message);});}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
if(!touchOnly){
const context=await browser.newContext({viewport:{width:1440,height:900}});await seed(context);const page=await context.newPage();listen(page);await page.goto(url);
await shot(page,'after-desktop-brief.png');await mode(page,'model');await ready(page);
await page.waitForTimeout(35000);evidence.renderer=await page.evaluate(()=>{const g=window.__hcsDemoViewer.gl.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL);});evidence.performance.workspaceAuto={level:await page.locator('[data-quality]').getAttribute('data-quality'),fps:await bench(page),canvas:await page.locator('canvas').boundingBox()};
await page.getByLabel('Viewer quality').selectOption('high');await page.waitForTimeout(2500);
const before=JSON.parse(fs.readFileSync(out+'before-verification.json','utf8'));
await page.locator('.house-viewer').evaluate((el,size)=>{el.style.cssText='position:absolute;left:0;top:0;flex:none;width:'+size[0]+'px;height:'+size[1]+'px;';},before.canvas);
await page.waitForTimeout(1200);await page.evaluate(pose=>{const v=window.__hcsDemoViewer;v.camera.position.set(...pose.position);v.camera.quaternion.set(...pose.quaternion);v.camera.fov=pose.fov;v.camera.updateProjectionMatrix();v.invalidate();},before.camera);await page.waitForTimeout(2200);
await page.locator('.house-canvas').screenshot({path:out+'after-exterior-matched-high.png',timeout:180000});
evidence.performance.matchedHigh=await bench(page);
await page.getByLabel('Viewer quality').selectOption('auto');await page.waitForTimeout(35000);evidence.performance.matchedAuto={level:await page.locator('[data-quality]').getAttribute('data-quality'),fps:await bench(page)};
await page.locator('.house-viewer').evaluate(el=>el.removeAttribute('style'));await page.getByRole('button',{name:'Front view',exact:true}).click();await page.waitForTimeout(2500);
await shot(page,'compass-angle-a.png');const a=await heading(page),box=await page.locator('canvas').boundingBox();
await page.mouse.move(box.x+box.width*.35,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.35+box.height/4,box.y+box.height*.45,{steps:24});await page.mouse.up();await page.waitForTimeout(2200);
const b=await heading(page),delta=((b-a+540)%360)-180;assert.ok(Math.abs(Math.abs(delta)-90)<8,'Orbit a quarter turn rotates compass 90 degrees');evidence.compass.push({test:'actual orbit drag',before:a,after:b,delta});await shot(page,'compass-angle-b.png');
await page.getByRole('treeitem',{name:'Living room',exact:true}).click();await page.getByRole('button',{name:'Cutaway',exact:true}).click();await page.waitForTimeout(1800);await shot(page,'after-desktop-3d-selected.png');
await mode(page,'plan');assert.equal(await page.locator('.workspace-plan .room-clickable').filter({has:page.locator('rect[stroke="#c2693e"]')}).count(),1);await shot(page,'after-desktop-2d.png');
const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.svg'));
await mode(page,'model');await ready(page);await mode(page,'present');await page.waitForTimeout(1800);assert.equal(await page.locator('.workspace-panel').count(),0);assert.equal(await page.getByLabel('Viewer quality').count(),0);await shot(page,'after-desktop-present.png');await page.getByRole('button',{name:'Exit presentation',exact:true}).click();
await page.getByRole('button',{name:'Walk inside',exact:true}).click();await page.waitForTimeout(1800);
await page.waitForFunction(()=>document.querySelector('.canvas-status')?.textContent.includes('Walk'),{timeout:10000});if(!await page.evaluate(()=>!!document.pointerLockElement))await page.getByRole('button',{name:'Click to control the camera',exact:true}).click();
for(const [label,degrees] of [['N',0],['E',90],['S',180],['W',270]]){
 const previous=await heading(page);console.log('Turning to',label,'from',previous,'locked',await page.evaluate(()=>document.pointerLockElement?.tagName));const turn=((degrees-previous+540)%360)-180;
 await page.evaluate(dx=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:dx,movementY:0})),turn*Math.PI/180/.0023);await page.waitForTimeout(400);
 await page.waitForFunction(target=>Math.abs(((+document.querySelector('.house-canvas .compass').dataset.heading-target+540)%360)-180)<2,degrees,{timeout:10000});const actual=await heading(page);console.log('Walk facing',label,'from',previous,'to',actual);assert.ok(Math.abs(((actual-degrees+540)%360)-180)<2);evidence.compass.push({test:'walk',facing:label,heading:actual});
}
await page.evaluate(()=>document.exitPointerLock());await shot(page,'after-desktop-walk.png');
await page.getByRole('button',{name:'Front view',exact:true}).click();
await page.getByRole('separator',{name:'Resize left panel'}).focus();await page.keyboard.press('ArrowRight');const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('hcs:panels:desktop')));assert.equal(stored.left,240);await page.reload();await page.getByRole('button',{name:'3D',exact:true}).click();await ready(page);assert.equal(await page.locator('.layers-panel').evaluate(el=>Math.round(el.getBoundingClientRect().width)),240);evidence.panelPersistence=stored;
await context.close();}
const touchContext=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:1});await seed(touchContext);const t=await touchContext.newPage();listen(t);await t.goto(url);await mode(t,'model');await ready(t);await t.getByLabel('Viewer quality').selectOption('balanced');
await t.getByRole('button',{name:'Toggle layers panel'}).click();await shot(t,'after-ipad-landscape-drawer.png');await t.getByRole('button',{name:'Close layers panel'}).click();
await t.getByRole('button',{name:'Walk inside',exact:true}).click();await t.locator('.walk-joystick').waitFor();const old=await t.evaluate(()=>window.__hcsDemoViewer.camera.position.toArray());const j=await t.locator('.walk-joystick').boundingBox();const cdp=await touchContext.newCDPSession(t);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:j.x+50,y:j.y+50}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:j.x+50,y:j.y+78}]});await t.waitForTimeout(900);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const moved=await t.evaluate(()=>window.__hcsDemoViewer.camera.position.toArray());assert.ok(Math.hypot(moved[0]-old[0],moved[2]-old[2])>.1,'Joystick moves the actual camera through existing collision resolver');evidence.touch.push({viewport:[1180,820],before:old,after:moved});await t.getByLabel('Look inside a room').selectOption({label:'Ground · Living room'});await t.waitForTimeout(1300);await shot(t,'after-ipad-landscape-walk.png');
await t.getByRole('button',{name:'Front view',exact:true}).click();await t.setViewportSize({width:820,height:1180});await t.waitForTimeout(1600);await t.getByRole('button',{name:'Toggle Inspector'}).click();await shot(t,'after-ipad-portrait-drawer.png');await t.getByRole('button',{name:'Close Inspector'}).click();
await t.getByLabel('Look inside a room').selectOption({label:'Ground · Living room'});await t.waitForTimeout(1500);await shot(t,'after-ipad-portrait-walk.png');
await t.getByRole('button',{name:'Front view',exact:true}).click();await t.setViewportSize({width:390,height:844});await t.waitForTimeout(1600);await t.getByRole('button',{name:'Toggle Inspector'}).click();await shot(t,'after-phone-3d-sheet.png');
await touchContext.close();
assert.equal(evidence.errors.length,0);fs.writeFileSync(out+'verification.json',JSON.stringify(evidence,null,2));console.log('Workspace verification complete',JSON.stringify(evidence.performance));
}finally{await browser.close();}})().catch(e=>{console.error(e);fs.writeFileSync(out+'verification-incomplete.json',JSON.stringify(evidence,null,2));process.exitCode=1;});
