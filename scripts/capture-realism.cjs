const fs = require('node:fs');
const assert = require('node:assert/strict');
let chromium; try { ({chromium} = require('playwright-core')); } catch { ({chromium} = require('../.work/qa/node_modules/playwright-core')); }

const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase), 'Pass before or after');
const smoke = process.argv.includes('--smoke');
const folder = 'docs/screenshots/realism/';
const styles = ['tn-contemporary-slats', 'tn-jaali-stone', 'tn-curved-villa', 'tn-tiled-bungalow', 'tn-narrow-g2'];
const styleLabels = ['Contemporary slats', 'Jaali & stone', 'Curved villa', 'Tiled bungalow', 'Narrow urban G+2'];
const rooms = ['living', 'dining', 'kitchen', 'bedroom', 'bathroom', 'lounge'];
fs.mkdirSync(folder, {recursive: true});

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
  page.setDefaultTimeout(180000);
  const errors = [], shots = [];
  const performanceSamples = [];
  const project = JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json', 'utf8'));
  await page.addInitScript(p => {
    localStorage.setItem('hcs_demo_logged', 'true');
    localStorage.setItem('hcs_demo_projects', JSON.stringify([p]));
    localStorage.setItem('hcs_last_project', p.id);
  }, project);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    console.log('Opening demo');
    await page.goto(process.env.FACADE_DEMO_URL || 'http://127.0.0.1:5251');
    console.log('Demo opened', await page.title());
    await page.locator('.boot-screen').waitFor({state: 'hidden', timeout: 180000});
    await page.getByRole('button', {name: '3D', exact: true}).first().click();
    console.log('Opening 3D home');
    await page.locator('canvas').waitFor({timeout: 240000});
    console.log('Canvas mounted');
    await page.locator('.viewer-loading').waitFor({state: 'hidden', timeout: 240000});
    console.log('Models loaded');
    for (let index = 0; index < (smoke ? 1 : styles.length); index++) {
      const style = styles[index];
      await page.getByRole('combobox', {name: 'Architectural style'}).click();
      await page.getByRole('listbox', {name: 'Options'}).getByRole('option').filter({hasText: styleLabels[index]}).click();
      await page.locator('.viewer-loading').waitFor({state: 'hidden', timeout: 240000});
      await page.getByRole('button', {name: 'Front view', exact: true}).click({force: true});
      await page.waitForTimeout(4000);
      const filename = `${phase}-${style}-front.png`;
      if (phase === 'after' || !fs.existsSync(folder + filename)) await page.locator('.house-canvas').screenshot({path: folder + filename});
      const metrics = await page.evaluate(() => {
        const v = window.__hcsDemoViewer;
        return {camera: v.camera.position.toArray(), fov: v.camera.fov, draws: v.gl.info.render.calls, triangles: v.gl.info.render.triangles};
      });
      shots.push({style, filename, lighting: 'recipe', quality: await page.locator('[data-quality]').getAttribute('data-quality'), fpsText: await page.locator('[data-quality]').innerText(), ...metrics});
      console.log(filename, shots.at(-1).fpsText);
    }
    await page.getByRole('combobox', {name: 'Architectural style'}).click();
    await page.getByRole('listbox', {name: 'Options'}).getByRole('option').filter({hasText: styleLabels[0]}).click();
    await page.locator('.viewer-loading').waitFor({state: 'hidden', timeout: 240000});
    await page.getByRole('combobox', {name: 'Look inside a room'}).click();
    const choices = (await page.getByRole('listbox', {name: 'Look inside a room'}).getByRole('option').allTextContents()).map(label => label.trim());
    await page.keyboard.press('Escape');
    console.log('Room choices', choices);
    for (const kind of (smoke ? rooms.slice(0, 1) : rooms)) {
      const selected = choices.find(label => label.toLowerCase().includes(kind) && !label.startsWith('Storage') && !label.startsWith('Shower'));
      if (!selected) { console.log('Missing room', kind); continue; }
      await page.getByRole('combobox', {name: 'Look inside a room'}).click();
      await page.getByRole('listbox', {name: 'Look inside a room'}).getByRole('option').filter({hasText: selected}).first().click();
      await page.waitForTimeout(smoke ? 14000 : 3800);
      if (smoke) console.log('Measured walk', await page.evaluate(async () => {const gl=window.__hcsDemoViewer.gl, start=gl.info.render.frame, t=performance.now();await new Promise(r=>setTimeout(r,4000));return {fps:(gl.info.render.frame-start)*1000/(performance.now()-t), draws:gl.info.render.calls, triangles:gl.info.render.triangles};}));
      const filename = `${phase}-${kind}.png`;
      if (phase === 'after' || !fs.existsSync(folder + filename)) await page.locator('.house-canvas').screenshot({path: folder + filename});
      shots.push({room: kind, label: selected, filename, quality: await page.locator('[data-quality]').getAttribute('data-quality'), fpsText: await page.locator('[data-quality]').innerText(), camera: await page.evaluate(() => window.__hcsDemoViewer.camera.position.toArray())});
      console.log(filename, shots.at(-1).fpsText);
    }
    if (phase === 'after' && !smoke) {
      const sample = () => page.evaluate(async () => {
        const v = window.__hcsDemoViewer, first = v.gl.info.render.frame, start = performance.now();
        while (performance.now() - start < 4200) {v.invalidate(); await new Promise(resolve => requestAnimationFrame(resolve));}
        const elapsed = performance.now() - start;
        return {fps: Math.round((v.gl.info.render.frame - first) * 10000 / elapsed) / 10, draws: v.gl.info.render.calls, triangles: v.gl.info.render.triangles};
      });
      performanceSamples.push({view: 'walk', preset: 'golden', quality: await page.locator('[data-quality]').getAttribute('data-quality'), ...await sample()});
      await page.getByRole('button', {name: 'Front view', exact: true}).click({force: true});
      await page.getByLabel('More viewing tools').click();
      for (const [preset, label] of [['day', 'Clear daylight'], ['golden', 'Golden hour'], ['sunset', 'Sunset'], ['dusk', 'Dusk']]) {
        await page.getByRole('combobox', {name: 'Presentation lighting'}).click();
        await page.getByRole('listbox', {name: 'Presentation lighting'}).getByRole('option').filter({hasText: label}).click();
        await page.waitForTimeout(8000);
        const result = {view: 'front', preset, quality: await page.locator('[data-quality]').getAttribute('data-quality'), ...await sample()};
        performanceSamples.push(result); console.log('Performance', result);
      }
    }
    const renderer = await page.evaluate(() => {const gl = window.__hcsDemoViewer.gl.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info'); return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);});
    console.log('Renderer', renderer);
    if (!smoke) fs.writeFileSync(folder + `${phase}-capture.json`, JSON.stringify({phase, viewport: [1280, 1000], demoProject: project.id, renderer, shots, performanceSamples, errors, capturedAt: new Date().toISOString()}, null, 2));
    if (errors.length) console.log('Browser errors', errors);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
