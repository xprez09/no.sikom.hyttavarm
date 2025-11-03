'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
function truncateForLog(input, max = 200) {
    return input.length <= max ? input : `${input.slice(0, max)}…`;
}
class SikomApp extends homey_1.default.App {
    onInit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('Sikom App has been initialized');
            this.registerFlowActions();
        });
    }
    registerFlowActions() {
        const groupOnAction = this.homey.flow.getActionCard('group-on');
        groupOnAction.registerRunListener((args) => __awaiter(this, void 0, void 0, function* () {
            const { groupId } = args;
            this.log('Group On action triggered', { groupId });
            this.assertValidGroupId(groupId);
            return this.controlGroup(groupId, true);
        }));
        const groupOffAction = this.homey.flow.getActionCard('group-off');
        groupOffAction.registerRunListener((args) => __awaiter(this, void 0, void 0, function* () {
            const { groupId } = args;
            this.log('Group Off action triggered', { groupId });
            this.assertValidGroupId(groupId);
            return this.controlGroup(groupId, false);
        }));
    }
    assertValidGroupId(groupId) {
        if (typeof groupId !== 'number' || !Number.isFinite(groupId)) {
            throw new Error('Invalid groupId argument supplied to Flow action');
        }
    }
    controlGroup(groupId, turnOn) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const username = this.homey.settings.get('username');
            const password = this.homey.settings.get('password');
            if (!username || !password) {
                this.error('Missing settings: please configure username and password');
                throw new Error('Missing settings: please configure username and password');
            }
            // Single authoritative URL: Device AddProperty switch_mode (1 = on, 0 = off)
            const switchValue = turnOn ? '1' : '0';
            const url = `https://api.connome.com/api/Device/${groupId}/AddProperty/switch_mode/${switchValue}/`;
            // Password suffix !!! is required by the BPAPI
            const passwordToUse = `${password}!!!`;
            const authHeader = `Basic ${Buffer.from(`${username}:${passwordToUse}`).toString('base64')}`;
            const startTime = Date.now();
            try {
                const response = yield fetch(url, {
                    method: 'GET',
                    headers: {
                        Authorization: authHeader,
                        'Content-Type': 'application/json',
                    },
                });
                const text = yield response.text();
                const elapsed = Date.now() - startTime;
                this.log('API Response', {
                    url,
                    status: response.status,
                    elapsed_ms: elapsed,
                    body: truncateForLog(text, 300),
                });
                // Check HTTP status
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${truncateForLog(text)}`);
                }
                // Parse JSON and check application-level status
                let parsed = null;
                try {
                    parsed = JSON.parse(text);
                }
                catch (_err) {
                    // Non-JSON response when expecting JSON; treat as success if 200 OK
                    this.log(`Successfully turned device ${groupId} ${turnOn ? 'on' : 'off'} (non-JSON response)`);
                    return true;
                }
                // Inspect bpapi_status if present
                // eslint-disable-next-line camelcase
                let bpStatus;
                let bpMessage;
                if ((_a = parsed === null || parsed === void 0 ? void 0 : parsed.Data) === null || _a === void 0 ? void 0 : _a.bpapi_status) {
                    // eslint-disable-next-line camelcase
                    const { bpapi_status, bpapi_message } = parsed.Data;
                    // eslint-disable-next-line camelcase
                    bpStatus = bpapi_status.toLowerCase();
                    bpMessage = bpapi_message;
                }
                if (bpStatus && bpStatus !== 'ok' && bpStatus !== 'success') {
                    throw new Error(`API reported non-success status [${bpStatus}]: ${bpMessage || 'unknown'}`);
                }
                this.log(`Successfully turned device ${groupId} ${turnOn ? 'on' : 'off'} using Device switch_mode endpoint`);
                return true;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.error('Error controlling device', { groupId, error: message });
                throw err;
            }
        });
    }
}
module.exports = SikomApp; // CommonJS export for Homey
exports.default = SikomApp; // Optional ES export
