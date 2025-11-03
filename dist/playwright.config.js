"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable node/no-unpublished-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
// Serving the settings page: we use the built-in webServer to serve the project root
// and then navigate to /settings/index.html in tests.
exports.default = (0, test_1.defineConfig)({
    testDir: path_1.default.join(__dirname, 'tests'),
    fullyParallel: true,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:5173', // arbitrary dev port; tests will start a server below
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npx serve -l 5173 .',
        port: 5173,
        reuseExistingServer: true,
        timeout: 10000,
    },
    projects: [
        {
            name: 'chromium',
            use: Object.assign({}, test_1.devices['Desktop Chrome']),
        },
        {
            name: 'firefox',
            use: Object.assign({}, test_1.devices['Desktop Firefox']),
        },
        {
            name: 'webkit',
            use: Object.assign({}, test_1.devices['Desktop Safari']),
        },
    ],
});
