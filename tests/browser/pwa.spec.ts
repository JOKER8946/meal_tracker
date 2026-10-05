import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {login} from './helpers';
test('production manifest, icons, worker, offline fallback and private-cache boundaries',async({page,context,request})=>{
  const manifestResponse=await request.get('/manifest.webmanifest');expect(manifestResponse.ok()).toBe(true);const manifest=await manifestResponse.json();
  expect(manifest.display).toBe('standalone');expect(manifest.start_url).toBe('/');expect(manifest.scope).toBe('/');expect(manifest.icons.some((i:{purpose:string})=>i.purpose==='maskable')).toBe(true);
  for(const icon of manifest.icons){const response=await request.get(icon.src);expect(response.ok()).toBe(true);const meta=await sharp(await response.body()).metadata();expect(`${meta.width}x${meta.height}`).toBe(icon.sizes);}
  await login(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)))).flat();});
  expect(cached).toContain('/offline.html');expect(cached.every(path=>path==='/offline.html'||path==='/favicon.svg'||path.startsWith('/icons/'))).toBe(true);
  const cdp=await context.newCDPSession(page);const details=await cdp.send('Page.getAppManifest');expect(details.errors).toEqual([]);
  await context.setOffline(true);await page.goto('/');await expect(page.getByRole('heading',{name:'A little pause.'})).toBeVisible();await expect(page.getByText('You’re offline.',{exact:false})).toBeVisible();await context.setOffline(false);
});
