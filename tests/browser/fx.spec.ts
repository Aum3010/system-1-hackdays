import {test,expect,type Page} from '@playwright/test';

async function enterDemoBattle(page:Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  await page.getByRole('button',{name:/enter.*arena|start.*battle|let.*battle|fight/i}).click();
}
async function playToWinner(page:Page, maxRounds=14) {
  for(let i=0;i<maxRounds*4;i++) {
    if(await page.getByRole('button',{name:'Rematch',exact:false}).isVisible())return;
    const p1=page.getByRole('button',{name:'Player 1 STRIKE',exact:true});
    if(await p1.isVisible() && await p1.isEnabled()) {
      await page.keyboard.press('KeyA');
      await page.keyboard.press('KeyJ');
    }
    await page.waitForTimeout(250);
  }
  await expect(page.getByRole('button',{name:'Rematch',exact:false})).toBeVisible({timeout:5000});
}

test('Skip animations: a full demo match still completes and the winner screen appears',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await enterDemoBattle(page);
  const skip=page.getByLabel('Skip animations');
  await skip.check();
  await expect(skip).toBeChecked();
  const started=Date.now();
  await playToWinner(page);
  await expect(page.getByRole('heading',{name:/WINS!/})).toBeVisible();
  expect(Date.now()-started).toBeLessThan(20000);
  // Preference persists across reloads.
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('object-arena-fx-v1')||'{}').skip)).toBe(true);
  expect(errors).toEqual([]);
});

test('reveal timeline: countdown, flip, callout, then input re-enables; Call It shows CALLED IT',async({page})=>{
  const consoleErrors:string[]=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('object-arena-fx-v1',JSON.stringify({skip:false,muted:true})));
  await enterDemoBattle(page);
  // P1 arms Call It (Q), picks Guard (S), guesses Strike (A); P2 strikes (J).
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyS');
  await expect(page.getByText('CALL IT: WHAT WILL PLAYER 2 PICK?',{exact:false})).toBeVisible();
  await page.keyboard.press('KeyA');
  await page.keyboard.press('KeyJ');
  await expect(page.locator('.fx-countdown')).toBeVisible();
  await expect(page.getByRole('button',{name:'Player 1 STRIKE',exact:true})).toBeDisabled();
  await expect(page.locator('.fx-callout',{hasText:'COUNTERED!'})).toBeVisible();
  await expect(page.locator('.fx-callout',{hasText:'CALLED IT!'})).toBeVisible();
  await expect(page.locator('.fx-move-card.is-revealed').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Player 1 STRIKE',exact:true})).toBeEnabled({timeout:6000});
  await expect(page.getByRole('button',{name:'Player 1 Call It',exact:true})).toBeDisabled();
  await expect(page.getByRole('log')).toContainText('CALLED IT!');
  expect(consoleErrors).toEqual([]);
});
