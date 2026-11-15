const fs=require('fs'),assert=require('assert/strict');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1280,height:1200}}),errors=[],out='docs/screenshots/facade-pass-2/';
 p.setDefaultTimeout(180000);const project=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json'));project.requirements.design.style='tn-jaali-stone';
 await p.addInitScript(project=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([project]));localStorage.setItem('hcs_last_project',project.id);},project);
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
 await p.goto('http://127.0.0.1:5251');await p.locator('.step-nav button').filter({hasText:'3D home'}).click();await p.locator('canvas').waitFor({timeout:240000});await p.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});console.log('Control check ready');
 await p.getByLabel('Presentation lighting',{exact:true}).selectOption('dusk');await p.getByLabel('Facade style',{exact:true}).selectOption('tn-tiled-bungalow');await p.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});assert.equal(await p.getByLabel('Presentation lighting',{exact:true}).inputValue(),'dusk');
 await p.getByLabel('Presentation lighting',{exact:true}).selectOption('day');await p.getByLabel('Facade style',{exact:true}).selectOption('tn-jaali-stone');await p.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});assert.equal(await p.getByLabel('Presentation lighting',{exact:true}).inputValue(),'day');
 await p.getByRole('button',{name:'Front view',exact:true}).click({force:true});await p.waitForTimeout(2500);
 const pose=JSON.parse(fs.readFileSync(out+'before-tn-jaali-stone-front-camera.json')).camera;
 await p.evaluate(pose=>{const v=window.__hcsDemoViewer;v.camera.position.set(...pose.position.map(n=>n/.3048));v.camera.quaternion.set(...pose.quaternion);v.camera.updateMatrixWorld();v.invalidate();},pose);await p.waitForTimeout(1200);
 const replay=await p.evaluate(()=>({position:window.__hcsDemoViewer.camera.position.toArray().map(n=>n*.3048),quaternion:window.__hcsDemoViewer.camera.quaternion.toArray()}));
 for(let i=0;i<3;i++)assert.ok(Math.abs(replay.position[i]-pose.position[i])<.0001,'Matched baseline camera must not drift');
 await p.getByRole('button',{name:'Front view',exact:true}).click({force:true});await p.waitForTimeout(2000);
 const eye=await p.evaluate(()=>window.__hcsDemoViewer.camera.position.y);assert.ok(Math.abs(eye-4)<.01);
 const key=await p.evaluate(()=>{const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 await p.getByLabel('Presentation lighting',{exact:true}).selectOption('recipe');await p.waitForTimeout(1000);
 const d=p.waitForEvent('download',{timeout:110000});await p.getByRole('button',{name:'Download 3D',exact:true}).click();fs.mkdirSync('exports/facade-pass-2',{recursive:true});await(await d).saveAs('exports/facade-pass-2/house.glb');
 console.log('Pass 2 GLB bytes',fs.statSync('exports/facade-pass-2/house.glb').size);
 await p.getByRole('button',{name:'Walk inside',exact:true}).click({force:true});await p.waitForTimeout(2000);
 await p.keyboard.press('e');await p.waitForTimeout(1600);const start=await p.evaluate(()=>window.__hcsDemoViewer.camera.position.z);
 await p.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});await p.locator('canvas').focus();await p.keyboard.down('w');await p.waitForTimeout(3500);await p.keyboard.up('w');
 const end=await p.evaluate(()=>window.__hcsDemoViewer.camera.position.z);assert.ok(end-start>2,'Walk must cross the entrance');
 await p.locator('.house-canvas').screenshot({path:out+'entrance-walk.png',timeout:180000});
 assert.equal(errors.length,0,errors.join('\n'));
 fs.writeFileSync(out+'controls-verification.json',JSON.stringify({manualLightingPersistsAcrossStyleChanges:true,frontEyeFeetAboveGround:eye+1.5,matchedCameraReplay:replay,baselineCamera:pose,walkTravelFeet:end-start,renderer:key,glbBytes:fs.statSync('exports/facade-pass-2/house.glb').size,browserErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
