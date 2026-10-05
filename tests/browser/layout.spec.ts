import {test,expect} from '@playwright/test';
import {login} from './helpers';
test('phone and desktop layouts stay within the screen and key controls work',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:360,height:800});await login(page);
  await expect(page.getByRole('button',{name:'Log sleep',exact:true}).or(page.getByRole('button',{name:'Edit sleep',exact:true}))).toBeVisible();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow at ${width}px`).toBe(true);
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Journal calendar'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`calendar overflow at ${width}px`).toBe(true);
    await page.getByRole('button',{name:'Your week',exact:true}).click();
    await expect(page.getByText('View exact weekly data',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`charts overflow at ${width}px`).toBe(true);
    await page.getByRole('button',{name:'Today',exact:true}).click();
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/daily-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/daily-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Log a meal',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(errors).toEqual([]);
});
