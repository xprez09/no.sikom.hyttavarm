'use strict';

import Homey from 'homey';
import fetch from 'node-fetch';

module.exports = class SikomApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Sikom App has been initialized');
    
    // Register Flow Actions
    this.registerFlowActions();
  }

  /**
   * Register flow action handlers
   */
  private registerFlowActions() {
    // Group On action
    const groupOnAction = this.homey.flow.getActionCard('group-on');
    groupOnAction.registerRunListener(async (args) => {
      this.log('Group On action triggered', args);
      return this.controlGroup(args.GroupID, true);
    });

    // Group Off action
    const groupOffAction = this.homey.flow.getActionCard('group-off');
    groupOffAction.registerRunListener(async (args) => {
      this.log('Group Off action triggered', args);
      return this.controlGroup(args.GroupID, false);
    });
  }

  /**
   * Control a device group
   */
  private async controlGroup(groupId: number, turnOn: boolean): Promise<boolean> {
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
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}!!!`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      // Log the response for debugging
      const responseBody = await response.text();
      this.log(`API Response: ${response.status} - ${responseBody}`);

      // Check if the response was successful
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      // Log success
      this.log(`Successfully turned group ${groupId} ${turnOn ? 'on' : 'off'}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.error(`Error controlling group ${groupId}: ${errorMessage}`);
      throw error;
    }
  }
}