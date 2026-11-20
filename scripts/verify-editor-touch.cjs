const fs=require('node:fs'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
const fixture=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:820,height:1100},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 await context.addInitScript(v=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([v]));localStorage.setItem('hcs_last_project',v.id);},fixture);
 const page=await context.newPage();await page.goto('http://127.0.0.1:5251/');await page.getByRole('button',{name:'2D',exact:true}).click();
 const room=page.locator('g.room-clickable[aria-label*="Living room"]').first();await room.waitFor();const box=await room.boundingBox();assert(box);
 const cdp=await context.newCDPSession(page),x=box.x+box.width*.18,y=box.y+box.height*.22;
 const originalX=await room.locator('rect').first().getAttribute('x');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(600);
 assert((await page.locator('.inspector-selection h2').innerText()).includes('Living room'));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24,y:y+18}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(200);assert.notEqual(await room.locator('rect').first().getAttribute('x'),originalX,'long press and drag moves the room');
 await page.screenshot({path:'docs/screenshots/editor/touch-tablet-plan.png'});
 const bed=page.locator('g.room-clickable[aria-label*="bedroom"]').first();await bed.scrollIntoViewIfNeeded();const b=await bed.boundingBox();assert(b);
 await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x+b.width*.18,y:b.y+b.height*.2,button:'left',clickCount:1,pointerType:'pen'});
 await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x+b.width*.18,y:b.y+b.height*.2,button:'left',clickCount:1,pointerType:'pen'});
 assert((await page.locator('.inspector-selection h2').innerText()).toLowerCase().includes('bedroom'));
 const phone=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 await phone.addInitScript(v=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([v]));localStorage.setItem('hcs_last_project',v.id);},fixture);
 const mobile=await phone.newPage();await mobile.goto('http://127.0.0.1:5251/');await mobile.getByRole('combobox',{name:'Workspace mode'}).click();await mobile.getByRole('option',{name:'2D',exact:true}).click();await mobile.locator('.workspace-plan .plan-svg').waitFor();await mobile.screenshot({path:'docs/screenshots/editor/touch-phone-plan.png'});
 await mobile.getByRole('button',{name:'Pan plan'}).click();const before=await mobile.locator('.workspace-plan .furnished-plan').evaluate(v=>v.scrollLeft);const phoneCdp=await phone.newCDPSession(mobile);await phoneCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y:540}]});await phoneCdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:540}]});await phoneCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(250);const after=await mobile.locator('.workspace-plan .furnished-plan').evaluate(v=>v.scrollLeft);assert(after>before,'phone plan pans horizontally');await mobile.screenshot({path:'docs/screenshots/editor/touch-phone-panned.png'});await phone.close();
 console.log('Emulated tablet drag, pen selection, and phone pan passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

