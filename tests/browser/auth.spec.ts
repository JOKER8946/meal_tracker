import { test, expect } from '@playwright/test';

test('real login persists on reload and sign-out removes the private view', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email address').fill(process.env.TEST_USER_A_EMAIL!);
  await page.getByLabel('Password', {exact:true}).fill(process.env.TEST_USER_A_PASSWORD!);
  await page.getByRole('button', {name:'Let’s go'}).click();
  await expect(page.getByRole('button', {name:'Sign out', exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', {name:'Sign out', exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Sign out', exact:true}).click();
  await expect(page.getByRole('button', {name:'Let’s go'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', {name:'Let’s go'})).toBeVisible();
});

test('signup UI handles confirmation; rejects an invalid live password', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', {name:'Create account',exact:true}).click();
  // Does not send unsolicited email. Live confirmation delivery is an acceptance check.
  await page.route('**/auth/v1/signup**', async route => {
    const payload = route.request().postDataJSON();
    expect(payload.email).toBe('signup-ui@example.test');
    expect(payload.password.length).toBeGreaterThanOrEqual(8);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'ui-test',email:payload.email},session:null})});
  });
  await page.getByLabel('Email address').fill('signup-ui@example.test');
  await page.getByLabel('Password', {exact:true}).fill('Test-only-password-123');
  await page.getByRole('button', {name:'Create my account'}).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await page.getByRole('button', {name:'Sign in',exact:true}).click();
  await page.getByLabel('Email address').fill(process.env.TEST_USER_A_EMAIL!);
  await page.getByLabel('Password', {exact:true}).fill('deliberately-wrong-test-password-345');
  await page.getByRole('button', {name:'Let’s go'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', {name:'Sign out',exact:true})).toHaveCount(0);
});
