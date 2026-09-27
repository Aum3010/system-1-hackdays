import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
import {DEMO_FIGHTERS} from '../../lib/game/demo';

// Provider routes are mocked with explicit fixtures: these tests cover UI flow, not Gemini accuracy.
const photo=resolve('public/fighters/bottle.jpg');
async function skipAnimations(page:Page) {
  await page.addInitScript(()=>localStorage.setItem('object-arena-fx-v1',JSON.stringify({skip:true,muted:true})));
}

test('VS screen explains how to play before the fight, including both traits',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  const briefing=page.getByRole('region',{name:'HOW TO WIN THIS FIGHT'});
  await expect(briefing).toBeVisible();
  await expect(briefing).toContainText('Strike beats Break');
  await expect(briefing).toContainText('Call It');
  await expect(briefing).toContainText('STAPLORD · Pierce');
  await expect(briefing).toContainText('HYDRONOX · Flow');
  await page.screenshot({path:'test-results/desktop-vs-briefing.png',fullPage:true});
  await page.getByRole('button',{name:'How to play'}).click();
  await expect(page.getByRole('dialog')).toContainText('Use your extras');
});

test('Arena Snap buffs an element, and Snap Reinforcement heals mid-battle',async({page})=>{
  await skipAnimations(page);
  await page.route('**/api/arena',route=>route.fulfill({json:{arena:'street'}}));
  await page.route('**/api/reinforcement',route=>route.fulfill({json:{item:'heal',objectName:'banana'}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  await page.getByLabel('Snap the arena').setInputFiles(photo);
  await expect(page.getByText('ARENA: STREET',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:/enter.*arena/i}).click();
  await expect(page.getByText('ARENA · STREET',{exact:false})).toBeVisible();
  // P1 snaps (G) while P2 strikes (J): P1 takes a hit, then gets 15 s to photograph an item.
  await page.keyboard.press('KeyG');
  await page.keyboard.press('KeyJ');
  const modal=page.getByRole('dialog',{name:/grab something/i});
  await expect(modal).toBeVisible();
  const hurt=Number(await page.getByRole('meter',{name:'STAPLORD health'}).getAttribute('aria-valuenow'));
  expect(hurt).toBeLessThan(88);
  await page.getByLabel('Upload reinforcement photo').setInputFiles(photo);
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('log')).toContainText('grabbed a banana: HEAL');
  const healed=Number(await page.getByRole('meter',{name:'STAPLORD health'}).getAttribute('aria-valuenow'));
  expect(healed).toBeGreaterThan(hurt);
  await expect(page.getByRole('button',{name:'Player 1 Snap',exact:true})).toBeDisabled();
});

test('Snap timer running out forfeits the item without blocking the game',async({page})=>{
  await skipAnimations(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  await page.getByRole('button',{name:/enter.*arena/i}).click();
  await page.keyboard.press('KeyG');
  await page.keyboard.press('KeyK');
  await expect(page.getByRole('dialog',{name:/grab something/i})).toBeVisible();
  await page.clock.runFor(16000);
  await expect(page.getByRole('dialog',{name:/grab something/i})).not.toBeVisible();
  await expect(page.getByRole('log')).toContainText('came back empty-handed');
  await expect(page.getByRole('button',{name:'Player 1 STRIKE',exact:true})).toBeEnabled();
});

test('Counter-Hunt: Player 2 finds a type counter in time and earns a bonus badge',async({page})=>{
  await skipAnimations(page);
  const [,hydronox,byteforge]=DEMO_FIGHTERS;
  let calls=0;
  await page.route('**/api/object-analysis',route=>route.fulfill({json:{analysis:{objectName:'Thing',category:'thing',confidence:.9,materials:['plastic'],properties:{durability:'medium',mobility:'medium',weight:'medium',sharpness:'low',fragility:'low',flexibility:'low',electronic:false},creative:{suggestedCharacterName:'X',suggestedDescription:'Y',suggestedSpecialAbility:'Z'}}}}));
  await page.route('**/api/character',route=>{calls++;route.fulfill({json:{character:{...(calls===1?hydronox:byteforge),id:`c${calls}`}}});});
  await page.goto('/');
  await page.getByRole('button',{name:'Snap your fighter',exact:false}).first().click();
  await page.getByLabel('Upload object photo').setInputFiles(photo);
  await page.getByText('Counter-Hunt:',{exact:false}).click();
  await page.getByRole('button',{name:/Add to battle/}).click();
  await expect(page.getByText('COUNTER-HUNT vs HYDRONOX',{exact:false})).toBeVisible();
  await expect(page.getByText('Find something ELECTRIC',{exact:false})).toBeVisible();
  await page.getByLabel('Upload object photo').setInputFiles(photo);
  await expect(page.getByText('Counter found!',{exact:false})).toBeVisible();
  await expect(page.getByText(/Counter-Hunter \+8 ATK/).first()).toBeVisible();
});
