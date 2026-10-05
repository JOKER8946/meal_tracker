import {test,expect} from '@playwright/test';
import {apiUser,login} from './helpers';
let cleanup: (()=>Promise<void>)|undefined;
test.afterEach(async()=>{await cleanup?.();cleanup=undefined;});
test('calendar selection loads the selected night and preserves edit controls',async({page})=>{
  const {client,user}=await apiUser();const day='2093-06-15';
  const check=await client.from('sleep_logs').select('id').eq('sleep_date',day);expect(check.data).toEqual([]);
  cleanup=async()=>{const result=await client.from('sleep_logs').delete().eq('sleep_date',day);expect(result.error).toBeNull();await client.auth.signOut({scope:'local'});};
  try{
    const fixture=await client.from('sleep_logs').insert({user_id:user.id,sleep_date:day,slept_at:'2093-06-14T23:00:00+05:30',woke_at:'2093-06-15T07:00:00+05:30'});expect(fixture.error).toBeNull();
    await login(page);await page.getByRole('button',{name:'History',exact:true}).click();await page.getByLabel('Journal date').fill('2093-06-14');
    await page.getByRole('button',{name:`View ${day}`,exact:true}).click();
    await expect(page.getByLabel('Journal date')).toHaveValue(day);await expect(page.getByRole('region',{name:'Sleep log'})).toContainText('8h 00m');
    await expect(page.getByRole('button',{name:'Edit sleep',exact:true})).toBeVisible();
    await page.screenshot({path:'test-results/calendar-debug.png',fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Your week',exact:true}).click();await page.getByText('View exact weekly data',{exact:true}).click();
    await expect(page.getByRole('row').filter({hasText:day})).toContainText('8h 00m');
    await expect(page.getByRole('img',{name:'Bar chart of nightly sleep hours; exact values in weekly data below'})).toBeVisible();
    await page.getByRole('button',{name:'History',exact:true}).click();
    await page.getByRole('button',{name:'View 2093-06-16',exact:true}).click();await expect(page.getByRole('button',{name:'Log sleep',exact:true})).toBeVisible();
  }finally{/* afterEach owns cleanup, including when an action times out. */}
});
