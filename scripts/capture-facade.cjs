/* Run the local app with VITE_DEMO_MODE=true. Uses a fictional, browser-local project. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;
try{({chromium}=require('playwright-core'));}catch{
 try{({chromium}=require('../.work/qa/node_modules/playwright-core'));}catch{
  throw new Error('Install the browser QA helper: npm install --prefix .work/qa --no-save playwright-core');
 }
}
const styles=['tn-contemporary-slats','tn-jaali-stone','tn-curved-villa','tn-tiled-bungalow','tn-narrow-g2'];
const out=path.resolve('docs/screenshots/facade'),url=process.env.FACADE_DEMO_URL||'http://127.0.0.1:5251';
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Capture only the local demo, never a live customer project');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
 page.setDefaultTimeout(180000);
 const project=JSON.parse(fs.readFileSync(path.join(out,'demo-project.json'),'utf8'));
 await page.addInitScript(project=>{
  localStorage.setItem('hcs_demo_logged','true');
  localStorage.setItem('hcs_demo_projects',JSON.stringify([project]));
  localStorage.setItem('hcs_last_project',project.id);
 },project);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(url);
  await page.locator('.step-nav button').filter({hasText:'3D home'}).click();
  await page.locator('canvas').waitFor({timeout:240000});
  await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
  await page.getByRole('button',{name:'Full screen',exact:true}).click({force:true});
  for(const id of styles){
   await page.getByLabel('Facade style',{exact:true}).selectOption(id);
   await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
   await page.getByRole('button',{name:'Exterior',exact:true}).click({force:true});
   await page.waitForTimeout(3000);
   await page.locator('.house-canvas').screenshot({path:path.join(out,id+'.png'),timeout:180000});
   const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('hcs_demo_projects'))[0]);
   assert.equal(data.requirements.plotWidth,30);assert.equal(data.requirements.plotDepth,50);
   assert.equal(data.requirements.floors,2);assert.equal(data.requirements.design.style,id);
   console.log('Captured',id);
  }
  await page.getByLabel('Facade style',{exact:true}).selectOption('tn-jaali-stone');
  await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
  await page.waitForTimeout(2000);
  let pending=page.waitForEvent('download',{timeout:60000});
  await page.getByRole('button',{name:'Download camera settings',exact:true}).click();
  await(await pending).saveAs(path.join(out,'camera.json'));
  fs.mkdirSync('exports/facade',{recursive:true});
  pending=page.waitForEvent('download',{timeout:110000});
  await page.getByRole('button',{name:'Download 3D',exact:true}).click();
  const model=await pending;await model.saveAs('exports/facade/facade-verification.glb');
  const bytes=fs.statSync('exports/facade/facade-verification.glb').size;
  assert.ok(bytes<50*1024*1024);assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({
   demoMode:true,plotFeet:[30,50],floors:2,viewport:[1600,1100],fov:52,
   lighting:'warm',streetFacing:'north',styles,browserErrors:errors,glbBytes:bytes,verifiedAt:new Date().toISOString()
  },null,2));
  console.log('GLB saved:',bytes,'bytes. Before image is deliberately preserved.');
  const saveCamera=async(name)=>{
   const pending=page.waitForEvent('download',{timeout:60000});
   await page.getByRole('button',{name:'Download camera settings',exact:true}).click({force:true});
   await(await pending).saveAs(path.join(out,name+'.json'));
   return JSON.parse(fs.readFileSync(path.join(out,name+'.json'),'utf8')).camera;
  };
  await page.getByRole('button',{name:'Walk inside',exact:true}).click({force:true});
  await page.waitForTimeout(2500);
  await page.locator('.house-canvas').screenshot({path:path.join(out,'entrance-closed.png'),timeout:180000});
  await page.keyboard.press('e');await page.waitForTimeout(1800);
  await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});
  const before=await saveCamera('entrance-camera-before');
  await page.locator('canvas').focus();await page.keyboard.down('w');
  await page.waitForTimeout(3500);await page.keyboard.up('w');await page.waitForTimeout(500);
  const after=await saveCamera('entrance-camera-after'),distance=after.position[2]-before.position[2];
  await page.locator('.house-canvas').screenshot({path:path.join(out,'entrance-open-walk.png'),timeout:180000});
  assert.ok(distance>.5,'Camera must cross the north entrance');assert.equal(errors.length,0);
  fs.writeFileSync(path.join(out,'walkthrough-verification.json'),JSON.stringify({
   style:'tn-jaali-stone',before,after,forwardTravelMetres:distance,openedWith:'E',movement:'W',browserErrors:errors
  },null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
