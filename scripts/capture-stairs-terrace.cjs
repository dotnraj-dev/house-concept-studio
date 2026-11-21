const fs=require('node:fs');
let chromium;try{({chromium}=require('playwright-core'));}catch{({chromium}=require('../.work/qa/node_modules/playwright-core'));}
const phase=process.argv[2]||'before';
if(!['before','after'].includes(phase))throw Error('Choose before or after');
const fixture=JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
const base='docs/screenshots/';
for(const folder of ['2d-navigation','stairs-terrace'])fs.mkdirSync(base+folder,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(project=>{localStorage.setItem('hcs_demo_logged','true');localStorage.setItem('hcs_demo_projects',JSON.stringify([project]));localStorage.setItem('hcs_last_project',project.id);},fixture);
 const page=await context.newPage();page.setDefaultTimeout(180000);await page.goto('http://127.0.0.1:5251/');
 await page.getByRole('button',{name:'2D',exact:true}).click();
 await page.screenshot({path:base+'2d-navigation/'+phase+'-plan.png'});
 await page.screenshot({path:base+'stairs-terrace/'+phase+'-ground-plan.png'});
 await page.getByRole('button',{name:'3D',exact:true}).click();await page.locator('canvas').waitFor({state:'attached'});await page.getByRole('button',{name:'Front view',exact:true}).click();await page.waitForTimeout(12000);
 await page.screenshot({path:base+'2d-navigation/'+phase+'-exterior.png',timeout:180000});
 await page.screenshot({path:base+'stairs-terrace/'+phase+'-exterior.png',timeout:180000});
 console.log('Captured '+phase);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
