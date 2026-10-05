import { createClient } from '@supabase/supabase-js';
import { expect,type Page } from '@playwright/test';
export async function apiUser(which='A') {
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email:process.env[`TEST_USER_${which}_EMAIL`]!,password:process.env[`TEST_USER_${which}_PASSWORD`]!});
  if(error)throw new Error(`Test account ${which} login failed (${error.status})`);
  return {client,user:data.user!};
}
export async function login(page:Page,which='A') {
  await page.goto('/');await page.getByLabel('Email address').fill(process.env[`TEST_USER_${which}_EMAIL`]!);
  await page.getByLabel('Password',{exact:true}).fill(process.env[`TEST_USER_${which}_PASSWORD`]!);
  await page.getByRole('button',{name:'Let’s go'}).click();
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible({timeout:45000});
}
