import { test,expect } from '@playwright/test';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { apiUser,login } from './helpers';

test('meal photo is compressed before upload; persisted notes, tag, editing and deletion work',async({page})=>{
  const {client,user}=await apiUser();const marker=`browser-meal-${randomUUID()}`;
  try{
    await login(page);await page.getByLabel('Journal date').fill('2091-04-12');
    await page.getByRole('button',{name:'Log a meal',exact:true}).click();
    const image=await sharp({create:{width:3000,height:2400,channels:3,background:'#ee5e8e'}}).png().toBuffer();
    await page.getByLabel('Choose meal photo').setInputFiles({name:'large-food.png',mimeType:'image/png',buffer:image});
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Ready to upload');
    await page.getByLabel('Meal type').selectOption('lunch');
    await page.getByLabel('Date & time').fill('2091-04-12T13:15');
    await page.getByLabel('Meal notes').fill(marker);
    const prepared=await page.getByRole('img',{name:'Meal photo preview'}).evaluate(async node=>{
      const img=node as HTMLImageElement;const blob=await (await fetch(img.src)).blob();
      return {size:blob.size,type:blob.type,width:img.naturalWidth,height:img.naturalHeight};
    });
    expect(prepared.size).toBeLessThan(200000);expect(Math.max(prepared.width,prepared.height)).toBeLessThanOrEqual(1280);expect(['image/webp','image/jpeg']).toContain(prepared.type);
    await page.getByRole('button',{name:'Save meal',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const card=page.getByRole('article').filter({hasText:marker});await expect(card).toBeVisible();
    await expect(card.getByRole('img')).toBeVisible();
    await page.reload();await page.getByLabel('Journal date').fill('2091-04-12');
    await expect(card).toBeVisible();
    const {data:rows,error}=await client.from('meals').select('*').eq('notes',marker);expect(error).toBeNull();expect(rows).toHaveLength(1);
    expect(rows![0].meal_type).toBe('lunch');expect(rows![0].meal_date).toBe('2091-04-12');expect(rows![0].user_id).toBe(user.id);
    const {data:stored,error:photoError}=await client.storage.from('meal-photos').download(rows![0].photo_path);expect(photoError).toBeNull();expect(stored!.size).toBe(prepared.size);
    const metadata=await sharp(Buffer.from(await stored!.arrayBuffer())).metadata();expect(Math.max(metadata.width!,metadata.height!)).toBeLessThanOrEqual(1280);expect(['webp','jpeg']).toContain(metadata.format);
    await card.getByRole('button',{name:'Edit lunch'}).click();await page.getByLabel('Meal type').selectOption('dinner');
    await page.getByLabel('Meal notes').fill(marker+' edited');await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);await expect(card.getByRole('heading',{name:'Dinner'})).toBeVisible();
    await card.getByRole('button',{name:'Delete dinner'}).click();
    await page.route('**/rest/v1/meals?*',async route=>{if(route.request().method()==='DELETE')await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Test deletion denied'})});else await route.continue();});
    await page.getByRole('button',{name:'Delete meal',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await page.unroute('**/rest/v1/meals?*');await page.getByRole('button',{name:'Delete meal',exact:true}).click();
    await expect(card).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0);
    const {data:left}=await client.from('meals').select('id').eq('id',rows![0].id);expect(left).toEqual([]);
    const gone=await client.storage.from('meal-photos').download(rows![0].photo_path);expect(gone.error).toBeTruthy();
  }finally{
    const {data}=await client.from('meals').select('id,photo_path').like('notes',`${marker}%`);
    if(data?.length){await client.from('meals').delete().in('id',data.map(x=>x.id));await client.storage.from('meal-photos').remove(data.map(x=>x.photo_path));}
    await client.auth.signOut({scope:'local'});
  }
});
