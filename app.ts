'use strict';

import Homey from 'homey';

function truncateForLog(input: string, max: number = 200): string {
  return input.length <= max ? input : `${input.slice(0, max)}…`;
}

class SikomApp extends Homey.App {
  async onInit(): Promise<void> {
    this.log('Sikom App has been initialized');
    this.registerFlowActions();
  }

  private registerFlowActions(): void {
    const groupOnAction = this.homey.flow.getActionCard('group-on');
    groupOnAction.registerRunListener(async (args) => {
      const { groupId } = args as { groupId: number };
      this.log('Group On action triggered', { groupId });
      this.assertValidGroupId(groupId);
      return this.controlGroup(groupId, true);
    });

    const groupOffAction = this.homey.flow.getActionCard('group-off');
    groupOffAction.registerRunListener(async (args) => {
      const { groupId } = args as { groupId: number };
      this.log('Group Off action triggered', { groupId });
      this.assertValidGroupId(groupId);
      return this.controlGroup(groupId, false);
    });
  }

  private assertValidGroupId(groupId: unknown): asserts groupId is number {
    if (typeof groupId !== 'number' || !Number.isFinite(groupId)) {
      throw new Error('Invalid groupId argument supplied to Flow action');
    }
  }

  private async controlGroup(groupId: number, turnOn: boolean): Promise<boolean> {
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
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
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
      let parsed: { Data?: { bpapi_status?: string; bpapi_message?: string } } | null = null;
      try {
        parsed = JSON.parse(text);
      } catch (_err) {
        // Non-JSON response when expecting JSON; treat as success if 200 OK
        this.log(`Successfully turned device ${groupId} ${turnOn ? 'on' : 'off'} (non-JSON response)`);
        return true;
      }

      // Inspect bpapi_status if present
      // eslint-disable-next-line camelcase
      let bpStatus: string | undefined;
      let bpMessage: string | undefined;
      if (parsed?.Data?.bpapi_status) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error('Error controlling device', { groupId, error: message });
      throw err;
    }
  }
}

module.exports = SikomApp; // CommonJS export for Homey
export default SikomApp; // Optional ES export
