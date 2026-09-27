import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
import sharp from 'sharp';

const analysis=(objectName='Water bottle',name='HYDRONOX')=>({objectName,category:'container',confidence:.96,materials:['metal','plastic'],properties:{durability:'high',mobility:'low',weight:'medium',sharpness:'very_low',fragility:'low',flexibility:'low',electronic:false},creative:{suggestedCharacterName:name,suggestedDescription:'A hydrated contender with unfinished business.',suggestedSpecialAbility:'Hydro Slam',trashTalk:'Stay hydrated. Stay intimidated.'}});
async function finishBattle(page:Page) {
  // Budget for a full 12-round match with reveals: rule-based classes (e.g. a 100-DEF tank) can go the distance.
  for(let i=0;i<45;i++) {
    if(await page.getByRole('button',{name:'Rematch',exact:false}).isVisible())return;
    const p1=page.getByRole('button',{name:'Player 1 STRIKE',exact:true});
    // Buttons stay disabled during each reveal (and the longer final-blow reveal).
    if(await p1.isVisible() && await p1.isEnabled()) {
      await p1.click();
      await page.getByRole('button',{name:'Player 2 STRIKE',exact:true}).click();
    }
    await page.waitForTimeout(1000);
  }
  await expect(page.getByRole('button',{name:'Rematch',exact:false})).toBeVisible({timeout:5000});
}
async function noOverflow(page:Page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}

test('offline demo: battle, defend, special, winner, rematch, reset and mobile layout',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.screenshot({path:'test-results/desktop-landing.png',fullPage:true});
  await noOverflow(page);
  await page.getByRole('button',{name:'How to play'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  await expect(page.getByText('STAPLORD',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/desktop-versus.png',fullPage:true});
  await page.getByRole('button',{name:/enter.*arena|start.*battle|let.*battle|fight/i}).click();
  // Special needs energy, so it starts locked.
  await expect(page.getByRole('button',{name:'Player 1 SPECIAL',exact:true})).toBeDisabled();
  // Keyboard blind picks: P1 guards (S), P2 strikes (J). Picks stay hidden until both lock in.
  await page.keyboard.press('KeyS');
  await expect(page.getByText('LOCKED IN').first()).toBeVisible();
  await expect(page.getByRole('log')).not.toContainText('read the Strike');
  await page.keyboard.press('KeyJ');
  await expect(page.getByRole('log')).toContainText('read the Strike');
  await expect(page.getByRole('meter',{name:'STAPLORD energy'})).toHaveAttribute('aria-valuenow','2');
  // Pass-the-phone flow: cover screen, P1 picks, cover, P2 picks, reveal.
  await page.getByRole('button',{name:/Pass-the-phone/}).click();
  await page.getByRole('button',{name:/I'm Player 1/}).click();
  await page.getByRole('button',{name:'Player 1 BREAK',exact:true}).click();
  await expect(page.getByRole('button',{name:/I'm Player 2/})).toBeVisible();
  await expect(page.getByText('Player 1 has locked in',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:/I'm Player 2/}).click();
  await page.getByRole('button',{name:'Player 2 GUARD',exact:true}).click();
  await expect(page.getByRole('log')).toContainText('smashes through');
  await page.getByRole('button',{name:/Keyboard mode/}).click();
  await page.screenshot({path:'test-results/desktop-battle.png',fullPage:true});
  await finishBattle(page);
  await expect(page.getByRole('heading',{name:/WINS!/})).toBeVisible();
  await page.screenshot({path:'test-results/desktop-winner.png',fullPage:true});
  await page.getByRole('button',{name:'Rematch',exact:false}).click();
  await expect(page.getByRole('log')).toContainText('Two objects enter');
  await finishBattle(page);
  await page.getByRole('button',{name:'Scan new objects',exact:false}).click();
  await expect(page.getByText("PLAYER 01 · YOU'RE UP",{exact:false})).toBeVisible();
  await expect(page.getByLabel('Upload object photo')).toBeAttached();
  await page.getByRole('button',{name:'Object Arena home'}).click();
  await page.setViewportSize({width:390,height:844});
  await noOverflow(page);
  await page.screenshot({path:'test-results/mobile-landing.png',fullPage:true});
  await page.getByRole('button',{name:'Use demo fighters',exact:true}).click();
  await noOverflow(page);
  await page.getByRole('button',{name:/enter.*arena|start.*battle|let.*battle|fight/i}).click();
  await noOverflow(page);
  await page.screenshot({path:'test-results/mobile-battle.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('fixture perception: large real photo compression, both reveals, battle, persistence and long names',async({page})=>{
  let scans=0;
  await page.route('**/api/object-analysis',async route=>{
    const payload=route.request().postDataJSON();
    const meta=await sharp(Buffer.from(payload.image.split(',')[1],'base64')).metadata();
    expect(meta.width!<=1024&&meta.height!<=1024).toBe(true);
    expect(payload.image.length).toBeLessThan(2_000_000);
    scans++;
    await route.fulfill({json:{analysis:analysis(scans===1?'Water bottle':'Laptop',scans===1?'HYDRONOX':'A VERY LONG BUT VALID FIGHTER NAME')}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Snap your fighter',exact:false}).click();
  const large=await sharp(resolve('public/fighters/bottle.jpg')).resize(4000,6000,{fit:'fill'}).jpeg({quality:95}).toBuffer();
  await page.getByLabel('Upload object photo').setInputFiles({name:'large-bottle.jpg',mimeType:'image/jpeg',buffer:large});
  await expect(page.getByRole('heading',{name:/NEW MENACE/})).toBeVisible({timeout:20000}); // real Laya on CPU takes ~5s
  await page.screenshot({path:'test-results/desktop-reveal.png',fullPage:true});
  await page.getByRole('button',{name:/Add to battle/}).click();
  await expect(page.getByText("PLAYER 02 · YOU'RE UP",{exact:false})).toBeVisible();
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/laptop.jpg'));
  await expect(page.getByText('A VERY LONG BUT VALID FIGHTER NAME',{exact:true})).toBeVisible({timeout:20000});
  await page.setViewportSize({width:390,height:844});
  await noOverflow(page);
  await page.screenshot({path:'test-results/mobile-reveal.png',fullPage:true});
  await page.getByRole('button',{name:/Add to battle/}).click();
  await noOverflow(page);
  await page.getByRole('button',{name:/enter.*arena|start.*battle|let.*battle|fight/i}).click();
  await noOverflow(page);
  await finishBattle(page);
  await page.reload();
  await expect(page.getByRole('button',{name:/Continue with your 2 saved fighters/})).toBeVisible();
  expect(scans).toBe(2);
});

test('invalid file, rejected image and unavailable Gemini provide recovery',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Snap your fighter',exact:false}).click();
  await page.getByLabel('Upload object photo').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  await expect(page.locator('.error-box[role=alert]')).toContainText('Choose a JPG');
  await page.route('**/api/object-analysis',r=>r.fulfill({status:422,json:{rejected:true,rejectionReason:'No clear object detected'}}));
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/bottle.jpg'));
  await expect(page.locator('.error-box[role=alert]')).toContainText('Find an object fighter');
  await page.unroute('**/api/object-analysis');
  await page.route('**/api/object-analysis',r=>r.fulfill({status:503,json:{error:'Try again, or use the demo fighters.',code:'GEMINI_UNAVAILABLE'}}));
  await page.getByLabel('Upload object photo').setInputFiles(resolve('public/fighters/bottle.jpg'));
  await expect(page.locator('.error-box[role=alert]')).toContainText('Try again');
  await page.locator('.error-box[role=alert]').getByRole('button',{name:'Use demo fighters',exact:false}).click();
  await expect(page.getByText('STAPLORD',{exact:true})).toBeVisible();
});

test('LIVE Gemini: two photo uploads -> real characters -> battle -> winner',async({page})=>{
  test.skip(process.env.LIVE_AI!=='1','Requires real configured Gemini; enable explicitly with LIVE_AI=1.');
  await page.goto('/');await page.getByRole('button',{name:'Snap your fighter',exact:false}).click();
  for(const file of ['bottle','laptop']) {
    await page.getByLabel('Upload object photo').setInputFiles(resolve(`public/fighters/${file}.jpg`));
    await expect(page.getByRole('heading',{name:/NEW MENACE/})).toBeVisible({timeout:45000});
    await page.getByRole('button',{name:/Add to battle/}).click();
  }
  await page.screenshot({path:'test-results/live-versus.png',fullPage:true});
  await page.getByRole('button',{name:/enter.*arena|start.*battle|let.*battle|fight/i}).click();
  await finishBattle(page);
  await expect(page.getByRole('heading',{name:/WINS!/})).toBeVisible();
  await page.screenshot({path:'test-results/live-winner.png',fullPage:true});
});
