/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable node/no-unpublished-import */
import { test, expect } from '@playwright/test';

// NOTE: The settings page depends on /homey.js which isn't available in this bare environment.
// We mock a minimal subset of the Homey SDK API that the page expects so the script can run.
// Strategy: Before navigation, we route /homey.js to a mock implementation.

test.beforeEach(async ({ page }) => {
  await page.route('**/homey.js', async (route) => {
    // Minimal Homey mock: ready/get/set/alert
    const body = `window.Homey = (function(){
      const store = { gateway: 'gw123', username: 'user1', password: 'secret' };
      return {
        ready: () => console.log('[mock] ready'),
        get: (key, cb) => setTimeout(() => cb(null, store[key] || ''), 10),
        set: (key, value, cb) => { store[key] = value; cb && cb(null); },
        alert: (msg) => console.log('[mock alert]', msg)
      };
    })();
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof window.onHomeyReady === 'function') {
        console.log('[mock] calling onHomeyReady');
        window.onHomeyReady(window.Homey);
      } else {
        console.warn('[mock] onHomeyReady not defined');
      }
    });`;
    await route.fulfill({ status: 200, contentType: 'application/javascript', body });
  });
});

test('settings form loads and saves', async ({ page }) => {
  await page.goto('/settings/index.html');

  const gateway = page.locator('#gateway');
  const username = page.locator('#username');
  const password = page.locator('#password');
  const saveBtn = page.locator('#save');

  await expect(gateway).toBeVisible();
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await expect(saveBtn).toBeVisible();

  // Wait for mocked Homey.get callbacks to populate fields
  await expect.poll(async () => ({
    g: await gateway.inputValue(),
    u: await username.inputValue(),
    p: await password.inputValue(),
  }), { timeout: 5000 }).toEqual({ g: 'gw123', u: 'user1', p: 'secret' });

  // Change values
  await gateway.fill('gw999');
  await username.fill('anotherUser');
  await password.fill('superSecret');

  await saveBtn.click();

  // Wait for Saved! state then revert.
  await expect(saveBtn).toHaveText(/Saving...|Saved!/, { timeout: 3000 });
  await expect(saveBtn).toHaveText('Save changes', { timeout: 5000 });

  // Values should remain in the inputs after save
  await expect(gateway).toHaveValue('gw999');
  await expect(username).toHaveValue('anotherUser');
  await expect(password).toHaveValue('superSecret');
});
