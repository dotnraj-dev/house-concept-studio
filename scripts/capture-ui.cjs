const fs = require('node:fs');
const {chromium} = require('../.work/qa/node_modules/playwright-core');
const fixture = JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json', 'utf8'));
const phase = process.argv[2] || 'after';
const theme = process.argv[3] || 'light';
const out = 'docs/screenshots/ui/';
fs.mkdirSync(out, {recursive: true});
const errors = [];

async function seed(context) {
  await context.addInitScript(({project, theme}) => {
    localStorage.setItem('hcs_demo_logged', 'true');
    localStorage.setItem('hcs_demo_projects', JSON.stringify([project]));
    localStorage.setItem('hcs_last_project', project.id);
    localStorage.setItem('hcs-theme', theme);
  }, {project: fixture, theme});
}
async function shot(page, device, name) {
  const file = `${out}${phase}-${theme}-${device}-${name}.png`;
  const width=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(width>1) throw Error(`${device} ${name} overflows horizontally by ${width}px`);
  await page.screenshot({path: file, timeout: 180000});
  console.log(file);
}
async function mode(page, name) {
  const mobile = page.locator('.mobile-mode');
  if (await mobile.isVisible()) {
    if (await mobile.locator('button').count()) await mobile.click();
    else { await mobile.selectOption(name); return; }
    await page.getByRole('option', {name: {brief:'Brief',plan:'2D',model:'3D'}[name], exact:true}).click();
  } else await page.locator('.workspace-modes').getByRole('button', {name: {brief:'Brief',plan:'2D',model:'3D'}[name], exact:true}).click();
}
async function run() {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const [device, width, height, touch] of [['desktop',1440,900,false],['ipad',1180,820,true],['phone',390,844,true]]) {
      const context = await browser.newContext({viewport:{width,height}, hasTouch:touch, isMobile:touch, colorScheme:theme === 'dark'?'dark':'light'});
      await seed(context);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(`${device}: ${e.message}`));
      page.on('console', message => {if(message.type()==='error') errors.push(`${device} console: ${message.text()}`);});
      await page.goto('http://127.0.0.1:5251');
      await page.locator('.project-workspace').waitFor();
      await mode(page, 'brief');
      await shot(page, device, 'brief');
      await mode(page, 'plan');
      await shot(page, device, '2d');
      await mode(page, 'model');
      await page.locator('canvas').waitFor({timeout:240000});
      await page.locator('.viewer-loading').waitFor({state:'hidden',timeout:240000});
      await page.waitForTimeout(1200);
      if (phase === 'after') await shot(page, device, '3d');
      const trigger = page.getByLabel('Viewer quality');
      if (phase === 'after' && await trigger.count()) await trigger.click();
      await shot(page, device, '3d-select');
      await page.reload();
      await page.locator('.project-workspace').waitFor();
      if (device !== 'phone') {
        await page.locator('.project-menu summary').click();
        await page.getByRole('button',{name:'All concepts'}).click();
      } else {
        await page.locator('.project-menu summary').click();
        await page.getByRole('button',{name:'All concepts'}).click();
      }
      await shot(page, device, 'dashboard');
      const settingsButton = page.locator('.sidebar-nav').getByRole('button',{name:/Settings/}).first();
      if (await settingsButton.count()) { await settingsButton.click(); await shot(page, device, 'settings'); }
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(`${out}${phase}-${theme}-errors.json`, JSON.stringify(errors, null, 2));
  if (errors.length) throw Error(errors.join('\n'));
}
run().catch(e => {console.error(e); process.exitCode=1;});
