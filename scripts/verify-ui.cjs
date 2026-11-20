const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('../.work/qa/node_modules/playwright-core');
const project=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(project=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([project]));localStorage.setItem('hcs_last_project',project.id);},project);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:5251');
 await page.locator('.project-workspace').waitFor();assert.equal(await page.locator('select').count(),0,'No native select controls');
 await page.getByRole('button',{name:'Switch to dark theme'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Switch to light theme'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.keyboard.press('Control+k');await page.getByRole('dialog',{name:'Search the studio'}).waitFor();await page.getByLabel('Search commands').fill('2D plan');await page.keyboard.press('Enter');assert.equal(await page.locator('.workspace-modes button.active').textContent(),'2D');
 await page.getByRole('button',{name:'Brief',exact:true}).click();await page.locator('.inspector-fields .ui-select-trigger').first().click();await page.getByLabel('Search options').fill('jaali');assert.ok(await page.getByRole('option').count()>0);await page.keyboard.press('Escape');assert.equal(await page.getByRole('listbox').count(),0);
 await page.getByRole('button',{name:'3D',exact:true}).click();await page.locator('canvas').waitFor({timeout:240000});await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});await page.locator('.room-jump .ui-select-trigger').click();await page.getByLabel('Search options').fill('Living room');await page.getByRole('option',{name:/Ground.*Living room/}).click();await page.waitForTimeout(500);assert.match(await page.locator('.canvas-status').textContent(),/Walk/);await page.screenshot({path:'docs/screenshots/ui/after-light-desktop-room-jump.png'});await page.getByRole('button',{name:'Front view',exact:true}).click();await page.waitForTimeout(400);assert.match(await page.locator('.canvas-status').textContent(),/Overview/);
 await context.close();assert.deepEqual(errors,[]);console.log('UI controls, theme, command palette, and browser console verified.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
