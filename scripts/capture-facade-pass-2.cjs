const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
const phase=process.argv[2]||'after';assert.ok(['before','after'].includes(phase));
const out='docs/screenshots/facade-pass-2/',styles=['tn-contemporary-slats','tn-jaali-stone','tn-curved-villa','tn-tiled-bungalow','tn-narrow-g2'];
fs.mkdirSync(out,{recursive:true});
if(phase==='before')assert.ok(!fs.existsSync(out+'before-verification.json'),'Preserve the authentic before captures.');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1200}}),errors=[],shots=[];
 page.setDefaultTimeout(180000);
 const project=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
 await page.addInitScript(project=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([project]));localStorage.setItem('hcs_last_project',project.id);},project);
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE',m.text().slice(0,200));}});
 try{
  await page.goto(process.env.FACADE_DEMO_URL||'http://127.0.0.1:5251');
  await page.locator('.step-nav button').filter({hasText:'3D home'}).click();
  await page.locator('canvas').waitFor({timeout:240000});console.log('3D canvas mounted');await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
  await page.getByRole('button',{name:'Full screen',exact:true}).click({force:true});await page.waitForTimeout(2000);
  for(const style of styles){console.log('Opening style',style);
   await page.getByLabel('Facade style',{exact:true}).selectOption(style);
   await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
   if(phase==='after')await page.getByLabel('Presentation lighting',{exact:true}).selectOption('recipe');
   for(const view of phase==='before'?['front']:['front','corner']){
    await page.getByRole('button',{name:view==='front'?'Front view':'Corner view',exact:true}).click({force:true});
    await page.waitForTimeout(2500);
    const file=phase+'-'+style+'-'+view+'.png';
    await page.locator('.house-canvas').screenshot({path:out+file,timeout:180000});
    const pending=page.waitForEvent('download',{timeout:60000});
    await page.getByRole('button',{name:'Download camera settings',exact:true}).click({force:true});
    const cameraFile=out+file.replace('.png','-camera.json');await(await pending).saveAs(cameraFile);
    const actual=JSON.parse(fs.readFileSync(cameraFile,'utf8')).camera;
    if(phase==='after'&&view==='front'){
     assert.ok(Math.abs(actual.position[1]-1.2192)<.01,'Front camera must stay 5.5 feet above ground');
     const baseline=JSON.parse(fs.readFileSync(out+'before-'+style+'-front-camera.json','utf8')).camera;
     await page.evaluate(pose=>{const v=window.__hcsDemoViewer;v.camera.position.set(...pose.position.map(n=>n/.3048));v.camera.quaternion.set(...pose.quaternion);v.camera.updateMatrixWorld();v.invalidate();},baseline);
     await page.waitForTimeout(1200);
     await page.locator('.house-canvas').screenshot({path:out+'after-'+style+'-matched-front.png',timeout:180000});
    }
    shots.push({style,view,file,camera:actual,
     lighting:await page.getByLabel('Presentation lighting',{exact:true}).inputValue()});
    console.log('Saved',file);
   }
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hcs_demo_projects'))[0]);
   assert.equal(saved.requirements.plotWidth,30);assert.equal(saved.requirements.plotDepth,50);assert.equal(saved.requirements.floors,2);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(out+phase+'-verification.json',JSON.stringify({phase,viewport:[1280,1200],plotFeet:[30,50],floors:2,shots,browserErrors:errors,capturedAt:new Date().toISOString()},null,2));
 }catch(e){console.log((await page.locator('body').innerText()).slice(-1000));throw e;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
