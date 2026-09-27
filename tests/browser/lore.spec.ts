import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {DEMO_FIGHTERS} from '../../lib/game/demo';
import {fallbackLore} from '../../lib/ai/fallbackLore';

// Gemini routes are mocked with explicit fixtures: this covers the UI flow, not Gemini output quality.
const analysis={objectName:'Water bottle',category:'container',confidence:.9,materials:['steel'],properties:{durability:'high',mobility:'medium',weight:'medium',sharpness:'low',fragility:'low',flexibility:'low',electronic:false},creative:{suggestedCharacterName:'X',suggestedDescription:'Y',suggestedSpecialAbility:'Z'}};

test('Lore Pack: personnel file on reveal (late upgrade), spice + owner sent, announcer speaks in combat',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('object-arena-fx-v1',JSON.stringify({skip:true,muted:true,spice:'mild'})));
  const lore={...fallbackLore({objectName:'Mocked bottle',materials:['steel'],electronic:false,jargon:'CIRCLE_BACK'}),corporateTitle:'Chief Hydration Officer'};
  lore.announcerBank={...lore.announcerBank,counter:['{self} files a counter-memo against {opponent}.','{self} files a counter-memo against {opponent}.']};
  const loreBodies:Record<string,unknown>[]=[];
  let n=0;
  await page.route('**/api/object-analysis',r=>r.fulfill({json:{analysis}}));
  await page.route('**/api/character',r=>{n++;r.fulfill({json:{character:{...DEMO_FIGHTERS[n===1?0:1],id:`f${n}`}}});});
  await page.route('**/api/lore',async r=>{loreBodies.push(r.request().postDataJSON());await new Promise(res=>setTimeout(res,700));await r.fulfill({json:{lore,source:'gemini',jargon:'CIRCLE_BACK'}});});
  await page.goto('/');
  await page.getByRole('button',{name:'Snap your fighter',exact:false}).first().click();
  await page.getByRole('button',{name:/Player 1 owner details/}).click();
  await page.getByLabel('Owner first name').fill('Sam');
  await page.getByLabel('Owner team').selectOption('Design');
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/bottle.jpg'));
  await expect(page.getByRole('region',{name:'Personnel file'})).toContainText('Chief Hydration Officer',{timeout:8000});
  expect(loreBodies[0]).toMatchObject({spice:'mild',owner:{name:'Sam',team:'Design'}});
  await page.getByPlaceholder('Optional answer').fill('Found it in the lost and found');
  await page.getByRole('button',{name:/Add to battle/}).click();
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/bottle.jpg'));
  await page.getByRole('button',{name:/Add to battle/}).click();
  // The second lore call carries an avoid list with the first fighter's lines.
  await expect.poll(()=>loreBodies.length).toBe(2);
  expect((loreBodies[1].avoid as string[])).toContain('Chief Hydration Officer');
  await page.getByRole('button',{name:/enter.*arena/i}).click();
  await page.keyboard.press('KeyS'); await page.keyboard.press('KeyJ');
  await expect(page.locator('.fx-announce')).toContainText('STAPLORD files a counter-memo against HYDRONOX');
  // Names and photos never go to localStorage as owner data.
  expect(await page.evaluate(()=>JSON.stringify(localStorage).includes('Sam'))).toBe(false);
});
