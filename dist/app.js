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
const node_fetch_1 = __importDefault(require("node-fetch"));
module.exports = class SikomApp extends homey_1.default.App {
    /**
     * onInit is called when the app is initialized.
     */
    onInit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('Sikom App has been initialized');
            // Register Flow Actions
            this.registerFlowActions();
        });
    }
    /**
     * Register flow action handlers
     */
    registerFlowActions() {
        // Group On action
        const groupOnAction = this.homey.flow.getActionCard('group-on');
        groupOnAction.registerRunListener((args) => __awaiter(this, void 0, void 0, function* () {
            this.log('Group On action triggered', args);
            return this.controlGroup(args.GroupID, true);
        }));
        // Group Off action
        const groupOffAction = this.homey.flow.getActionCard('group-off');
        groupOffAction.registerRunListener((args) => __awaiter(this, void 0, void 0, function* () {
            this.log('Group Off action triggered', args);
            return this.controlGroup(args.GroupID, false);
        }));
    }
    /**
     * Control a device group
     */
    controlGroup(groupId, turnOn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get settings
                const gateway = this.homey.settings.get('gateway');
                const username = this.homey.settings.get('username');
                const password = this.homey.settings.get('password');
                // Validate settings
                if (!gateway || !username || !password) {
                    this.error('Missing settings: please configure gateway, username, and password');
                    throw new Error('Missing settings: please configure gateway, username, and password');
                }
                // Build API URL and command
                const command = turnOn ? 'turnOn' : 'turnOff';
                const url = `https://api.connome.com/api/Device/${groupId}/${command}`;
                // Make the REST API call
                const response = yield (0, node_fetch_1.default)(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}!!!`).toString('base64'),
                        'Content-Type': 'application/json'
                    }
                });
                // Log the response for debugging
                const responseBody = yield response.text();
                this.log(`API Response: ${response.status} - ${responseBody}`);
                // Check if the response was successful
                if (!response.ok) {
                    throw new Error(`API call failed with status: ${response.status}`);
                }
                // Log success
                this.log(`Successfully turned group ${groupId} ${turnOn ? 'on' : 'off'}`);
                return true;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.error(`Error controlling group ${groupId}: ${errorMessage}`);
                throw error;
            }
        });
    }
};
