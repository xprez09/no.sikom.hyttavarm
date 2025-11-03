'use strict';

const Homey = require('homey');
// Using global fetch (Node 18+) – node-fetch not required

class SikomApp extends Homey.App {
  
  /**
   * onInit is called when the app is initialized
   */
  async onInit() {
    this.log('Sikom app has been initialized');

    // Register flow card actions
    this._registerFlowActions();
  }

  /**
   * Register all flow actions
   */
  _registerFlowActions() {
    // Group On flow action
    const groupOnAction = this.homey.flow.getActionCard('group-on');
    groupOnAction.registerRunListener(async (args) => {
      this.log('Turning on group with ID:', args.groupId);
      return this._controlGroup(args.groupId, true);
    });

    // Group Off flow action
    const groupOffAction = this.homey.flow.getActionCard('group-off');
    groupOffAction.registerRunListener(async (args) => {
      this.log('Turning off group with ID:', args.groupId);
      return this._controlGroup(args.groupId, false);
    });
  }

  /**
   * Control a group (turn on or off)
   * @param {number} groupId - The group ID to control
   * @param {boolean} turnOn - True to turn on, false to turn off
   * @returns {Promise<boolean>} - Success status
   */
  async _controlGroup(groupId, turnOn) {
    try {
      const username = this.homey.settings.get('username');
      const password = this.homey.settings.get('password');
      if (!username || !password) {
        this.error('Missing settings: username or password not configured');
        throw new Error('Please configure username and password in the app settings');
      }
      if (typeof groupId !== 'number' || !Number.isFinite(groupId)) {
        throw new Error('Invalid groupId supplied');
      }
      const switchValue = turnOn ? '1' : '0';
      const apiUrl = `https://api.connome.com/api/Device/${groupId}/AddProperty/switch_mode/${switchValue}/`;
      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
      this.log('Issuing request to Device switch_mode endpoint', { apiUrl, groupId, turnOn });
      const start = Date.now();
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      });
      const elapsed = Date.now() - start;
      const text = await response.text();
      this.log('API Response', { url: apiUrl, status: response.status, elapsed_ms: elapsed, bodySnippet: text.slice(0, 300) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { parsed = null; }
      const bpStatus = parsed?.Data?.bpapi_status?.toLowerCase();
      if (bpStatus && bpStatus !== 'ok' && bpStatus !== 'success') {
        throw new Error(`API reported non-success status [${bpStatus}]: ${parsed?.Data?.bpapi_message || 'unknown'}`);
      }
      this.log(`Successfully turned device ${groupId} ${turnOn ? 'on' : 'off'} using Device switch_mode endpoint`);
      return true;
    } catch (error) {
      this.error('Error controlling group:', error);
      throw error;
    }
  }
}

module.exports = SikomApp;
