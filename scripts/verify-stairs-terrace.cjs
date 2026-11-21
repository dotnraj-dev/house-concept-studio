const assert=require('node:assert/strict');
const fs=require('node:fs');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
const fixture=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
const root='docs/screenshots/';
async function open(browser,project){
 const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});
 await context.addInitScript(p=>{if(!localStorage.getItem('hcs_demo_logged')){localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([p]));localStorage.setItem('hcs_last_project',p.id);}},project);
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5251/');await page.getByRole('button',{name:'2D',exact:true}).click();
 await page.locator('.workspace-plan .plan-svg').waitFor();return {context,page,errors};
}
async function floor(page,name){await page.getByRole('treeitem',{name:new RegExp(name)}).first().click();await page.waitForTimeout(400);}
async function model(page,path){await page.getByRole('button',{name:'3D',exact:true}).click();await page.locator('canvas').waitFor({state:'attached'});await page.getByRole('button',{name:'Front view',exact:true}).click();await page.waitForTimeout(12000);await page.screenshot({path});}
async function terraceWalk(page,path){await page.getByRole('combobox',{name:'Look inside a room'}).click();await page.getByRole('option',{name:/Terrace.*roof deck/}).click();await page.waitForTimeout(4000);await page.screenshot({path});}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const proof={};try{
 const internal=await open(browser,fixture),page=internal.page;
 await page.screenshot({path:root+'2d-navigation/after-plan.png'});await page.screenshot({path:root+'stairs-terrace/after-ground-plan.png'});
 const editor=page.getByRole('button',{name:'Editor mode'});assert.equal(await editor.getAttribute('aria-pressed'),'false');assert.equal(await page.getByRole('button',{name:'Add room'}).count(),0);
 const svg=page.locator('.workspace-plan .plan-svg'),before=await svg.getAttribute('viewBox'),compass=await page.locator('.plan-compass').boundingBox();
 const box=await svg.boundingBox(),cursor={x:box.x+box.width*.62,y:box.y+box.height*.51};
 const anchorBefore=await svg.evaluate((e,p)=>{const q=e.createSVGPoint();q.x=p.x;q.y=p.y;const v=q.matrixTransform(e.getScreenCTM().inverse());return [v.x,v.y];},cursor);
 await page.mouse.move(cursor.x,cursor.y);await page.mouse.wheel(0,-350);await page.waitForTimeout(200);
 const anchorAfter=await svg.evaluate((e,p)=>{const q=e.createSVGPoint();q.x=p.x;q.y=p.y;const v=q.matrixTransform(e.getScreenCTM().inverse());return [v.x,v.y];},cursor);
 assert.ok(Math.hypot(anchorBefore[0]-anchorAfter[0],anchorBefore[1]-anchorAfter[1])<.08,'Wheel zoom must retain cursor point');
 assert.notEqual(await svg.getAttribute('viewBox'),before);const compassAfter=await page.locator('.plan-compass').boundingBox();assert.ok(Math.abs(compassAfter.x-compass.x)<1&&Math.abs(compassAfter.y-compass.y)<1&&Math.abs(compassAfter.width-compass.width)<1&&Math.abs(compassAfter.height-compass.height)<1);
 await page.screenshot({path:root+'2d-navigation/zoomed-plan.png'});
 await page.getByRole('button',{name:'Fit plan'}).click();assert.equal(await svg.getAttribute('viewBox'),before);
 await page.getByRole('button',{name:'100%'}).click();assert.match(await page.locator('.plan-zoom-level').textContent(),/100%/);
 await page.keyboard.press('0');assert.equal(await svg.getAttribute('viewBox'),before);
 const room=page.locator('.workspace-plan [data-room-id]').first(),roomRect=room.locator('rect').first(),roomX=await roomRect.getAttribute('x'),roomY=await roomRect.getAttribute('y'),roomBox=await roomRect.boundingBox();await page.mouse.move(roomBox.x+roomBox.width*.45,roomBox.y+roomBox.height*.45);await page.mouse.down();await page.mouse.move(roomBox.x+roomBox.width*.45+40,roomBox.y+roomBox.height*.45+35,{steps:8});await page.mouse.up();assert.equal(await roomRect.getAttribute('x'),roomX);assert.equal(await roomRect.getAttribute('y'),roomY);
 await room.click();await page.getByRole('button',{name:'Zoom to selected room'}).click();assert.notEqual(await svg.getAttribute('viewBox'),before);
 await page.getByRole('button',{name:'Fit plan'}).click();const cdp=await page.context().newCDPSession(page),touchBefore=await svg.getAttribute('viewBox'),touchBox=await svg.boundingBox(),cy=touchBox.y+touchBox.height*.52,lx=touchBox.x+touchBox.width*.39,rx=touchBox.x+touchBox.width*.61;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:lx,y:cy,id:1},{x:rx,y:cy,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:lx-40,y:cy+18,id:1},{x:rx+40,y:cy+18,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.notEqual(await svg.getAttribute('viewBox'),touchBefore,'Two-finger pinch and pan must change the view');await page.screenshot({path:root+'2d-navigation/touch-gesture-plan.png'});
 await page.getByRole('button',{name:'Fit plan'}).click();await editor.click();assert.equal(await editor.getAttribute('aria-pressed'),'true');await page.getByText('Editing',{exact:true}).waitFor();await page.screenshot({path:root+'2d-navigation/editor-plan.png'});
 await page.getByText('All changes saved',{exact:true}).waitFor({timeout:10000});await page.reload();await page.getByRole('button',{name:'2D',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Editor mode'}).getAttribute('aria-pressed'),'true');
 proof.navigation={cursorAnchorErrorFeet:Math.hypot(anchorBefore[0]-anchorAfter[0],anchorBefore[1]-anchorAfter[1]),fitRestored:true,oneToOne:true,twoFingerGesture:true,viewOnlyRoomStayedPut:true,editorPersisted:true};
 await page.getByRole('button',{name:'Editor mode'}).click();await floor(page,'Floor 1');await page.screenshot({path:root+'stairs-terrace/internal-first-plan.png'});
 await floor(page,'Terrace level');await page.screenshot({path:root+'stairs-terrace/internal-terrace-plan.png'});
 await model(page,root+'stairs-terrace/internal-exterior.png');fs.copyFileSync(root+'stairs-terrace/internal-exterior.png',root+'stairs-terrace/after-exterior.png');fs.copyFileSync(root+'stairs-terrace/internal-exterior.png',root+'2d-navigation/after-exterior.png');await terraceWalk(page,root+'stairs-terrace/internal-terrace-walk.png');
 proof.internal={terracePlan:true,threeDCanvas:true,terraceWalk:true,pageErrors:internal.errors};assert.deepEqual(internal.errors,[]);await internal.context.close();
 const externalProject=structuredClone(fixture);externalProject.id='terrace-external-independent';externalProject.title='External side stair · independent first floor';externalProject.requirements.plotWidth=55;externalProject.requirements.plotDepth=70;externalProject.requirements.design={...externalProject.requirements.design,services:[],customSetbacks:true,setbacks:{north:5,east:8,south:5,west:8},editorEnabled:true,terrace:{stairLocation:'side',stairType:'dogleg',independentFloors:[1],tankMount:'slab',tankCapacity:1500}};
 const external=await open(browser,externalProject),ep=external.page;assert.equal(await ep.getByRole('button',{name:'Editor mode'}).getAttribute('aria-pressed'),'true');
 assert.equal(await ep.getByRole('button',{name:'External stair'}).count(),1);await ep.screenshot({path:root+'stairs-terrace/external-ground-plan.png'});
 await floor(ep,'Floor 1');await ep.screenshot({path:root+'stairs-terrace/external-first-plan.png'});
 await floor(ep,'Terrace level');await ep.screenshot({path:root+'stairs-terrace/external-terrace-plan.png'});
 const marker=ep.getByRole('button',{name:'Service Overhead water tank'}),circle=marker.locator('circle');const oldX=+await circle.getAttribute('cx'),oldY=+await circle.getAttribute('cy');const markerBox=await circle.boundingBox();
 await ep.mouse.move(markerBox.x+markerBox.width/2,markerBox.y+markerBox.height/2);await ep.mouse.down();await ep.mouse.move(markerBox.x+markerBox.width/2-60,markerBox.y+markerBox.height/2-55,{steps:12});await ep.mouse.up();await ep.waitForTimeout(400);
 const newX=+await ep.getByRole('button',{name:'Service Overhead water tank'}).locator('circle').getAttribute('cx'),newY=+await ep.getByRole('button',{name:'Service Overhead water tank'}).locator('circle').getAttribute('cy');assert.ok(Math.hypot(newX-oldX,newY-oldY)>1,'Tank marker must move through B1 drag');
 await ep.screenshot({path:root+'stairs-terrace/external-tank-moved.png'});
 proof.external={tankBefore:[oldX,oldY],tankAfter:[newX,newY],tankDragged:true,pageErrors:external.errors};
 await model(ep,root+'stairs-terrace/external-exterior.png');await ep.locator('.viewer-options > summary').click();await ep.getByRole('checkbox',{name:'Surroundings'}).uncheck();await ep.locator('.viewer-options > summary').click();await ep.evaluate(()=>{const v=window.__hcsDemoViewer;v.camera.position.set(30,25,45);v.camera.lookAt(19,10,20);v.invalidate();});await ep.waitForTimeout(900);await ep.screenshot({path:root+'stairs-terrace/external-side-3d.png'});await terraceWalk(ep,root+'stairs-terrace/external-terrace-walk.png');assert.deepEqual(external.errors,[]);await external.context.close();
 const pitchedProject=structuredClone(fixture);pitchedProject.id='terrace-tiled-bungalow';pitchedProject.title='Single-storey tiled bungalow · rear terrace';pitchedProject.requirements={...pitchedProject.requirements,plotWidth:45,plotDepth:65,floors:1,bedrooms:1,bathrooms:1,parking:false,design:{...pitchedProject.requirements.design,style:'tn-tiled-bungalow',roof:'kerala',services:[]}};
 const pitched=await open(browser,pitchedProject),pp=pitched.page;await floor(pp,'Terrace level');await pp.screenshot({path:root+'stairs-terrace/pitched-terrace-plan.png'});await pp.getByRole('button',{name:'3D',exact:true}).click();await pp.locator('canvas').waitFor({state:'attached'});await pp.waitForTimeout(12000);await pp.screenshot({path:root+'stairs-terrace/pitched-front-3d.png'});await pp.evaluate(()=>{const v=window.__hcsDemoViewer;v.camera.position.set(0,29,57);v.camera.lookAt(0,10,7);v.invalidate();});await pp.waitForTimeout(900);await pp.screenshot({path:root+'stairs-terrace/pitched-rear-3d.png'});proof.pitched={singleStoreyTerrace:true,threeDCanvas:true,pageErrors:pitched.errors};assert.deepEqual(pitched.errors,[]);await pitched.context.close();
 fs.writeFileSync(root+'stairs-terrace/browser-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
