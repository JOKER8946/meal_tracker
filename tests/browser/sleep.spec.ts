import {test,expect} from '@playwright/test';
import {apiUser,login} from './helpers';
test('sleep crosses midnight, rejects invalid times, persists and can be edited and deleted',async({page})=>{
  const {client}=await apiUser();const day='2092-05-21';
  const existing=await client.from('sleep_logs').select('id').eq('sleep_date',day);expect(existing.data).toEqual([]);
  try{
    await login(page);await page.getByLabel('Journal date').fill(day);await page.getByRole('button',{name:'Log sleep',exact:true}).click();
    await page.getByLabel('Bedtime').fill('2092-05-20T23:30');await page.getByLabel('Wake-up time').fill('2092-05-21T07:15');
    await expect(page.getByRole('dialog')).toContainText('7h 45m');await page.getByRole('button',{name:'Save sleep',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('region',{name:'Sleep log'})).toContainText('7h 45m');
    await page.reload();await page.getByLabel('Journal date').fill(day);await expect(page.getByRole('region',{name:'Sleep log'})).toContainText('7h 45m');
    await page.getByRole('button',{name:'Edit sleep',exact:true}).click();await page.getByLabel('Wake-up time').fill('2092-05-20T21:00');await page.getByRole('button',{name:'Save sleep changes'}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Wake-up must be after');
    await page.getByLabel('Wake-up time').fill('2092-05-21T08:00');await page.getByRole('button',{name:'Save sleep changes'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('region',{name:'Sleep log'})).toContainText('8h 30m');
    const {data}=await client.from('sleep_logs').select('duration_minutes').eq('sleep_date',day);expect(Number(data![0].duration_minutes)).toBe(510);
    await page.getByRole('button',{name:'Delete sleep',exact:true}).click();await page.getByRole('button',{name:'Delete sleep log',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Log sleep',exact:true})).toBeVisible();
  }finally{await client.from('sleep_logs').delete().eq('sleep_date',day);await client.auth.signOut({scope:'local'});}
});
