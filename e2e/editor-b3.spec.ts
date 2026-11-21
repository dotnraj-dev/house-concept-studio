import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {chooseOption, openMode, seed} from './helpers';

async function roomCentre(page:import('@playwright/test').Page, name:string){
  return page.locator(`.workspace-plan .plan-svg [data-room-id][aria-label^="${name}"]`).first().evaluate(el=>{
    const r=el.querySelector('rect')!,x=Number(r.getAttribute('x'))+Number(r.getAttribute('width'))/2,y=Number(r.getAttribute('y'))+Number(r.getAttribute('height'))/2,p=new DOMPoint(x,y).matrixTransform(el.getScreenCTM()!);
    return {x:p.x,y:p.y};
  });
}

test('B3 editor controls, exact sizes, clean exports and saved toggles', async ({page}, info) => {
  test.setTimeout(35_000);
  await seed(page);
  await page.goto('/');
  await openMode(page, '2D');
  await page.getByRole('button', {name: 'Editor mode'}).click();
  await expect(page.locator('.workspace-plan .plan-svg')).toBeVisible();
  if (info.project.name === 'desktop') {
    mkdirSync('docs/screenshots/2d-editor-b3', {recursive:true});
    await page.screenshot({path:'docs/screenshots/2d-editor-b3/after-editor.png'});
  }
  await expect(page.getByRole('button',{name:'Adapt plan on'})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Move furniture off'})).toHaveAttribute('aria-pressed','false');
  const svg=page.locator('.workspace-plan .plan-svg');
  await expect(svg.locator('[data-plan-label]')).not.toHaveCount(0);
  await page.getByRole('button',{name:'Adapt plan on'}).click();
  await expect(page.getByRole('button',{name:'Adapt plan off'})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Move furniture off'}).click();
  await expect(page.getByRole('button',{name:'Move furniture on'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Move furniture on'}).click();
  await svg.locator('[data-room-id]').first().click({force:true});
  await expect(page.getByLabel('Room width in feet')).toBeAttached();
  if(!await page.getByLabel('Room width in feet').isVisible())await page.getByRole('button',{name:'Toggle Inspector'}).click();
  const width=Number(await page.getByLabel('Room width in feet').inputValue());
  await page.getByLabel('Room width in feet').fill(String(width-.25));
  await page.getByLabel('Room width in feet').press('Enter');
  await expect(page.getByLabel('Room width in feet')).toHaveValue(String(width-.25));
  await expect(svg.locator('.editor-handle-top')).toHaveCount(8);
  if(info.project.name==='desktop')await page.screenshot({path:'docs/screenshots/2d-editor-b3/after-selected.png'});
  if(await page.getByRole('button',{name:'Close panel'}).isVisible())await page.getByRole('button',{name:'Close panel'}).click();
  const svgDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download SVG'}).first().click();
  const downloaded=await svgDownload;
  const content=await downloaded.createReadStream();
  let xml='';for await(const chunk of content)xml+=chunk.toString();
  expect(xml).not.toMatch(/plan-resize-handle|editor-handle-top|#c2693e/);
  const pngDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download PNG'}).first().click();
  expect((await pngDownload).suggestedFilename()).toMatch(/\.png$/);
  await page.getByRole('button',{name:'Undo'}).click();
  await expect(page.getByLabel('Room width in feet')).toHaveValue(String(width));
  await page.reload();
  await openMode(page,'2D');
  await expect(page.getByRole('button',{name:'Adapt plan off'})).toHaveAttribute('aria-pressed','false');
  await expect(page.getByRole('button',{name:'Move furniture off'})).toHaveAttribute('aria-pressed','false');
});

test('B3 rotation, door side, adaptation, furniture lock and bathroom drag', async ({page}, info) => {
  test.setTimeout(90_000);
  if(info.project.name!=='desktop')return;
  await seed(page);await page.goto('/');await openMode(page,'2D');
  await page.getByRole('button',{name:'Editor mode'}).click();
  const svg=page.locator('.workspace-plan .plan-svg');
  const sofa=svg.locator('[aria-label^="Sofa in Living room"]').first();
  // With the lock on, a pointer on the sofa selects its room.
  const sofaBox=await sofa.boundingBox();expect(sofaBox).toBeTruthy();
  await page.mouse.click(sofaBox!.x+sofaBox!.width/2,sofaBox!.y+sofaBox!.height/2);
  await expect(page.getByRole('heading',{name:'Living room'})).toBeVisible();
  await page.getByRole('button',{name:'Adapt plan on'}).click();
  const beforeW=Number(await page.getByLabel('Room width in feet').inputValue()),beforeH=Number(await page.getByLabel('Room depth in feet').inputValue());
  await page.getByRole('button',{name:'Rotate room 90 degrees'}).click();
  await expect(page.getByLabel('Room width in feet')).toHaveValue(String(beforeH));
  await expect(page.getByLabel('Room depth in feet')).toHaveValue(String(beforeW));
  const door=page.getByRole('combobox',{name:'Door side'});
  if(await door.count()){
    await chooseOption(page,'Door side',/^east$/i);
    await expect(door).toContainText(/east/i);
    await page.getByRole('button',{name:'Undo'}).click();
  }
  await page.getByRole('button',{name:'Undo'}).click();
  await expect(page.getByLabel('Room width in feet')).toHaveValue(String(beforeW));
  await page.getByRole('button',{name:'Adapt plan off'}).click();
  await page.getByLabel('Room width in feet').fill(String(beforeW+.25));
  await page.getByLabel('Room width in feet').press('Enter');
  await expect(page.getByLabel('Room width in feet')).toHaveValue(String(Math.round((beforeW+.25)*4)/4));
  await expect(page.locator('.editor-history')).toContainText('adjusted');
  await page.getByRole('button',{name:'Undo'}).click();
  await page.getByRole('button',{name:'Adapt plan on'}).click();
  const bathStart=await roomCentre(page,'Bathroom 1'),bedEnd=await roomCentre(page,'Parents bedroom');
  await page.mouse.move(bathStart.x,bathStart.y);await page.mouse.down();await page.mouse.move(bedEnd.x,bedEnd.y,{steps:8});await page.mouse.up();
  const bath=await svg.locator('[data-room-id][aria-label^="Bathroom 1"] > rect').first().evaluate(el=>({x:Number(el.getAttribute('x')),y:Number(el.getAttribute('y')),w:Number(el.getAttribute('width')),h:Number(el.getAttribute('height'))}));
  expect(bath.x).toBeGreaterThanOrEqual(0);expect(bath.y).toBeGreaterThanOrEqual(0);
  expect(bath.x+bath.w).toBeLessThanOrEqual(24.01);expect(bath.y+bath.h).toBeLessThanOrEqual(42.01);
  if(await page.getByRole('button',{name:'Undo'}).isEnabled())await page.getByRole('button',{name:'Undo'}).click();
  await page.getByRole('button',{name:'Move furniture off'}).click();
  await expect(svg.getByRole('button',{name:/Sofa in Living room/i})).toBeVisible();
});

test('B3 iPad touch selects and resizes with a live dimension label', async ({page},info) => {
  if(info.project.name!=='ipad')return;
  await seed(page);await page.goto('/');await openMode(page,'2D');
  await page.getByRole('button',{name:'Editor mode'}).click();
  await page.getByRole('button',{name:'Adapt plan on'}).click();
  const room=await roomCentre(page,'Living room'),cdp=await page.context().newCDPSession(page);
  const touch=async(type:'touchStart'|'touchMove'|'touchEnd',x:number,y:number)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await touch('touchStart',room.x,room.y);await touch('touchEnd',room.x,room.y);
  await expect(page.getByLabel('Room width in feet')).toBeAttached();
  if(!await page.getByLabel('Room width in feet').isVisible())await page.getByRole('button',{name:'Toggle Inspector'}).click();
  const before=Number(await page.getByLabel('Room width in feet').inputValue());
  if(await page.getByRole('button',{name:'Close panel'}).isVisible())await page.getByRole('button',{name:'Close panel'}).click();
  const handle=page.locator('.workspace-plan .editor-handle-top').nth(3),box=await handle.boundingBox();expect(box).toBeTruthy();
  const x=box!.x+box!.width/2,y=box!.y+box!.height/2;
  const label=page.locator('.workspace-plan [data-plan-label]').filter({hasText:'Living room'}).first();
  const textBefore=await label.textContent();
  await touch('touchStart',x,y);await touch('touchMove',x+18,y);
  await expect(label).not.toHaveText(textBefore,{timeout:5000});
  await touch('touchEnd',x+18,y);
  await expect.poll(async()=>Number(await page.getByLabel('Room width in feet').inputValue())).toBeGreaterThan(before);
  await cdp.detach();
});
