"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable node/no-unpublished-import */
const test_1 = require("@playwright/test");
// NOTE: The settings page depends on /homey.js which isn't available in this bare environment.
// We mock a minimal subset of the Homey SDK API that the page expects so the script can run.
// Strategy: Before navigation, we route /homey.js to a mock implementation.
test_1.test.beforeEach((_a) => __awaiter(void 0, [_a], void 0, function* ({ page }) {
    yield page.route('**/homey.js', (route) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield route.fulfill({ status: 200, contentType: 'application/javascript', body });
    }));
}));
(0, test_1.test)('settings form loads and saves', (_a) => __awaiter(void 0, [_a], void 0, function* ({ page }) {
    yield page.goto('/settings/index.html');
    const gateway = page.locator('#gateway');
    const username = page.locator('#username');
    const password = page.locator('#password');
    const saveBtn = page.locator('#save');
    yield (0, test_1.expect)(gateway).toBeVisible();
    yield (0, test_1.expect)(username).toBeVisible();
    yield (0, test_1.expect)(password).toBeVisible();
    yield (0, test_1.expect)(saveBtn).toBeVisible();
    // Wait for mocked Homey.get callbacks to populate fields
    yield test_1.expect.poll(() => __awaiter(void 0, void 0, void 0, function* () {
        return ({
            g: yield gateway.inputValue(),
            u: yield username.inputValue(),
            p: yield password.inputValue(),
        });
    }), { timeout: 5000 }).toEqual({ g: 'gw123', u: 'user1', p: 'secret' });
    // Change values
    yield gateway.fill('gw999');
    yield username.fill('anotherUser');
    yield password.fill('superSecret');
    yield saveBtn.click();
    // Wait for Saved! state then revert.
    yield (0, test_1.expect)(saveBtn).toHaveText(/Saving...|Saved!/, { timeout: 3000 });
    yield (0, test_1.expect)(saveBtn).toHaveText('Save changes', { timeout: 5000 });
    // Values should remain in the inputs after save
    yield (0, test_1.expect)(gateway).toHaveValue('gw999');
    yield (0, test_1.expect)(username).toHaveValue('anotherUser');
    yield (0, test_1.expect)(password).toHaveValue('superSecret');
}));
