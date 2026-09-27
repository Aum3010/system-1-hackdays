import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
import {DEMO_FIGHTERS} from '../../lib/game/demo';

// Laya routes are mocked with explicit fixtures: these tests cover the solo-mode UI, not Laya accuracy.
async function skipAnimations(page:Page) {
  await page.addInitScript(()=>localStorage.setItem('object-arena-fx-v1',JSON.stringify({skip:true,muted:true})));
}
async function enterSolo(page:Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  const toggle=page.getByRole('button',{name:/play solo vs laya/i});
  await toggle.click();
  await expect(page.getByRole('button',{name:/solo: laya plays player 2/i})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:/enter.*arena/i}).click();
  await expect(page.getByText('SOLO VS LAYA',{exact:false})).toBeVisible();
}
async function playSoloToWinner(page:Page) {
  for(let i=0;i<80;i++) {
    if(await page.getByRole('button',{name:'Rematch',exact:false}).isVisible())return;
    const strike=page.getByRole('button',{name:'Player 1 STRIKE',exact:true});
    if(await strike.isVisible() && await strike.isEnabled()) await page.keyboard.press(i%3===0?'KeyS':'KeyA');
    await page.waitForTimeout(200);
  }
  await expect(page.getByRole('button',{name:'Rematch',exact:false})).toBeVisible({timeout:5000});
}

test('solo vs Laya: the bot locks in blind each round, P2 keys are ignored, and a match reaches a winner',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const bodies:{opponentMoves:string[]}[]=[];
  await skipAnimations(page);
  await page.route('**/api/bot-move',route=>{bodies.push(route.request().postDataJSON());route.fulfill({json:{prediction:{strike:.7,guard:.1,break:.1,special:.1},source:'laya'}});});
  await enterSolo(page);
  const pad=page.locator('.bot-pad');
  await expect(pad).toContainText('LOCKED IN');
  await expect(page.getByRole('button',{name:'Player 2 STRIKE',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/pass-the-phone/i})).toHaveCount(0);
  await page.keyboard.press('KeyJ');
  await expect(page.getByRole('log')).not.toContainText('R1');
  await page.screenshot({path:'test-results/desktop-solo-battle.png',fullPage:true});
  await playSoloToWinner(page);
  await expect(page.getByRole('heading',{name:/WINS!/})).toBeVisible();
  // The first request is made before Player 1 has moved; later ones only carry past moves.
  expect(bodies[0].opponentMoves).toEqual([]);
  expect(bodies.length).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('solo vs Laya without Laya: the built-in bot plays and says so',async({page})=>{
  await skipAnimations(page);
  await page.route('**/api/bot-move',route=>route.fulfill({status:503,json:{error:'Laya is off; the built-in bot plays instead.',code:'LAYA_NOT_CONFIGURED'}}));
  await enterSolo(page);
  await expect(page.locator('.bot-pad')).toContainText('Laya is offline: the built-in bot picked.');
  await page.keyboard.press('KeyA');
  await expect(page.getByRole('log')).toContainText('R1');
});

test("reveal shows Laya's read for Laya-decided fighters only",async({page})=>{
  const analysis={objectName:'Thing',category:'thing',confidence:.9,materials:['steel'],properties:{durability:'medium',mobility:'medium',weight:'medium',sharpness:'low',fragility:'low',flexibility:'low',electronic:false},creative:{suggestedCharacterName:'X',suggestedDescription:'Y',suggestedSpecialAbility:'Z'}};
  const laya={...DEMO_FIGHTERS[1],id:'laya-1',metadata:{...DEMO_FIGHTERS[1].metadata,decisionProvider:'laya'},layaRead:{primaryType:{choice:'water',confidence:.69,used:true},statNudge:{attack:-3,defense:5,health:0,speed:4}}};
  await page.route('**/api/object-analysis',r=>r.fulfill({json:{analysis}}));
  await page.route('**/api/character',r=>r.fulfill({json:{character:laya}}));
  await page.route('**/api/lore',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Snap your fighter',exact:false}).click();
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/bottle.jpg'));
  const read=page.getByRole('region',{name:"Laya's read"});
  await expect(read).toContainText('WATER');
  await expect(read).toContainText('69% sure');
  await expect(read).toContainText('DEF +5');
  await expect(read).toContainText('ATK -3');
  await expect(read).not.toContainText('HP');
});
