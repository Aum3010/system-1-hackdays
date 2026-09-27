import {test,expect} from '@playwright/test';

// Base-UI freeze: these screens must stay pixel-identical when animations are off.
// Baselines were captured before the animation layer was added (tests/browser/visual.spec.ts-snapshots).
test.use({reducedMotion:'reduce'});
const opts={fullPage:true,maxDiffPixelRatio:0.001,animations:'disabled' as const,stylePath:'tests/browser/hide-overlays.css'};

test('base UI unchanged: landing and capture',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page).toHaveScreenshot('landing.png',opts);
  await page.getByRole('button',{name:'Snap your fighter',exact:false}).first().click();
  await expect(page.getByText("PLAYER 01 · YOU'RE UP",{exact:false})).toBeVisible();
  await expect(page).toHaveScreenshot('capture.png',opts);
});
