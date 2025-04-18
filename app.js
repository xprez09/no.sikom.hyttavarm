'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

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
      // Get settings
      const gateway = this.homey.settings.get('gateway');
      const username = this.homey.settings.get('username');
      const password = this.homey.settings.get('password');
      
      if (!gateway || !username || !password) {
        this.error('Missing settings: gateway, username or password not configured');
        throw new Error('Please configure gateway, username and password in the app settings');
      }

      // API endpoint for Sikom
      const apiUrl = `https://api.connome.com/api/Gateway/${gateway}/ControlGroupByID/${groupId}?command=${turnOn ? 'On' : 'Off'}`;
      
      // Create authorization header with Basic auth
      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
      
      // Make API request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to control group: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      this.log('API response:', result);
      return true;
    } catch (error) {
      this.error('Error controlling group:', error);
      throw error;
    }
  }
}

module.exports = SikomApp;
