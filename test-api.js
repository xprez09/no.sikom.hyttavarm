#!/usr/bin/env node
'use strict';

/**
 * Standalone test script for Sikom BPAPI Device endpoint
 * Tests the switch_mode endpoint before deploying to Homey
 * 
 * Usage:
 *   node test-api.js <deviceId> <command>
 * 
 * Examples:
 *   node test-api.js 361177 on
 *   node test-api.js 361177 off
 *   node test-api.js 361177 status
 * 
 * Configuration:
 *   Create a .env.local file with:
 *     SIKOM_USERNAME=your-username
 *     SIKOM_PASSWORD=your-password
 */

// Load environment from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Configuration - reads from .env.local
const config = {
  username: process.env.SIKOM_USERNAME || '',
  password: process.env.SIKOM_PASSWORD || '',
  useSuffix: true // Always append !!! suffix as required by the API
};

if (!config.username || !config.password) {
  console.error('\n❌ Missing credentials!');
  console.error('Create a .env.local file with:');
  console.error('');
  console.error('SIKOM_USERNAME=your-username');
  console.error('SIKOM_PASSWORD=your-password');
  console.error('');
  process.exit(1);
}

function truncateForLog(input, max = 500) {
  if (typeof input !== 'string') return input;
  return input.length <= max ? input : `${input.slice(0, max)}… (truncated)`;
}

function getAuthHeader() {
  const passwordToUse = config.useSuffix ? `${config.password}!!!` : config.password;
  return `Basic ${Buffer.from(`${config.username}:${passwordToUse}`).toString('base64')}`;
}

async function sendGetRequest(url) {
  const startTime = Date.now();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  const elapsed = Date.now() - startTime;
  return { response, text, elapsed };
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    return null;
  }
}

function extractSwitchModeValue(payload) {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const candidates = [];

  // Direct fields
  candidates.push(payload.switch_mode, payload.switchMode);

  // Common BPAPI shapes
  if (payload.Data && typeof payload.Data === 'object') {
    candidates.push(payload.Data.switch_mode, payload.Data.switchMode);
  }

  // BPAPI device.Properties object map
  const propertyMaps = [
    payload?.Data?.device?.Properties,
    payload?.device?.Properties,
  ];

  for (const propertyMap of propertyMaps) {
    if (!propertyMap || typeof propertyMap !== 'object') continue;
    if (propertyMap.switch_mode && typeof propertyMap.switch_mode === 'object') {
      candidates.push(propertyMap.switch_mode.Value, propertyMap.switch_mode.value);
    }
    if (propertyMap.switch_readable_mode && typeof propertyMap.switch_readable_mode === 'object') {
      candidates.push(propertyMap.switch_readable_mode.Value, propertyMap.switch_readable_mode.value);
    }
  }

  // Search in array payloads for a switch_mode property/value pair
  const arraysToScan = [];
  if (Array.isArray(payload.bpapi_array)) arraysToScan.push(payload.bpapi_array);
  if (Array.isArray(payload.Data?.bpapi_array)) arraysToScan.push(payload.Data.bpapi_array);
  if (Array.isArray(payload.Properties)) arraysToScan.push(payload.Properties);
  if (Array.isArray(payload.Data?.Properties)) arraysToScan.push(payload.Data.Properties);

  for (const arr of arraysToScan) {
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      if (Object.prototype.hasOwnProperty.call(item, 'switch_mode')) {
        candidates.push(item.switch_mode);
      }
      const key = (item.key || item.name || item.property || '').toString().toLowerCase();
      if (key === 'switch_mode') {
        candidates.push(item.value, item.val, item.property_value);
      }
    }
  }

  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    if (value === 0 || value === '0' || value === false || value === 'off') return 0;
    if (value === 1 || value === '1' || value === true || value === 'on') return 1;
  }

  return undefined;
}

async function testDeviceControl(deviceId, turnOn) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`Testing: Device ${deviceId} - Turn ${turnOn ? 'ON' : 'OFF'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate inputs
  if (!deviceId || isNaN(deviceId)) {
    throw new Error('Invalid deviceId - must be a number');
  }

  // Build URL and auth
  const switchValue = turnOn ? '1' : '0';
  const url = `https://api.connome.com/api/Device/${deviceId}/AddProperty/switch_mode/${switchValue}/`;
  const authHeader = getAuthHeader();

  console.log('Request Details:');
  console.log('  URL:', url);
  console.log('  Method: GET');
  console.log('  Auth: Basic (username:', config.username + ', suffix: enabled)');
  console.log('  Headers:');
  console.log('    Authorization: Basic ***');
  console.log('    Content-Type: application/json');
  console.log('');

  try {
    const { response, text, elapsed } = await sendGetRequest(url);

    console.log('Response:');
    console.log('  Status:', response.status, response.statusText);
    console.log('  Time:', elapsed + 'ms');
    console.log('  Content-Type:', response.headers.get('content-type'));
    console.log('');

    console.log('Response Body:');
    console.log(truncateForLog(text));
    console.log('');

    // Check HTTP status
    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${truncateForLog(text)}`);
    }

    // Parse JSON
    let parsed = null;
    try {
      parsed = JSON.parse(text);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('');
    } catch (parseErr) {
      console.log('⚠️  Non-JSON response (treating as success if HTTP 200)');
      console.log('✅ SUCCESS - Device', deviceId, turnOn ? 'turned ON' : 'turned OFF');
      return true;
    }

    // Check bpapi_status
    const bpStatus = parsed?.Data?.bpapi_status?.toLowerCase();
    const bpMessage = parsed?.Data?.bpapi_message;

    if (bpStatus) {
      console.log('BPAPI Status:', parsed.Data.bpapi_status);
      if (bpMessage) {
        console.log('BPAPI Message:', bpMessage);
      }
      console.log('');
    }

    if (bpStatus && bpStatus !== 'ok' && bpStatus !== 'success') {
      console.error('❌ API Error - Non-success status:', bpStatus);
      console.error('Message:', bpMessage || 'unknown');
      throw new Error(`API reported non-success status [${bpStatus}]: ${bpMessage || 'unknown'}`);
    }

    console.log('✅ SUCCESS - Device', deviceId, turnOn ? 'turned ON' : 'turned OFF');
    return true;

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nFull error:', err);
    throw err;
  }
}

async function testDeviceStatus(deviceId, verbose = false) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`Testing: Device ${deviceId} - Read STATUS`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (!deviceId || isNaN(deviceId)) {
    throw new Error('Invalid deviceId - must be a number');
  }

  const candidateUrls = [
    `https://api.connome.com/api/Device/${deviceId}/`,
    `https://api.connome.com/api/Device/${deviceId}`,
    `https://api.connome.com/api/Device/${deviceId}/Properties/`,
    `https://api.connome.com/api/Device/${deviceId}/Properties`,
  ];

  let firstSuccessPayload = null;

  for (const url of candidateUrls) {
    console.log('Trying URL:', url);
    try {
      const { response, text, elapsed } = await sendGetRequest(url);
      console.log(`  HTTP: ${response.status} ${response.statusText} (${elapsed}ms)`);

      if (!response.ok) {
        if (verbose) {
          console.log('  Body:', truncateForLog(text, 300));
        }
        continue;
      }

      const parsed = parseJsonSafe(text);
      if (!parsed) {
        if (verbose) {
          console.log('  Non-JSON body:', truncateForLog(text, 300));
        }
        continue;
      }

      if (!firstSuccessPayload) {
        firstSuccessPayload = parsed;
      }

      const switchMode = extractSwitchModeValue(parsed);
      if (switchMode === 1) {
        console.log('\n✅ STATUS: ON\n');
        return true;
      }
      if (switchMode === 0) {
        console.log('\n✅ STATUS: OFF\n');
        return true;
      }

      if (verbose) {
        console.log('  JSON (truncated):', truncateForLog(JSON.stringify(parsed), 500));
      }
    } catch (err) {
      console.log('  Request error:', err.message);
    }
  }

  console.log('\n⚠️  Could not detect switch_mode from current endpoint candidates.');
  console.log('   Use --verbose to inspect response bodies and update extraction logic.');

  if (firstSuccessPayload && verbose) {
    console.log('\nFirst successful JSON payload:');
    console.log(JSON.stringify(firstSuccessPayload, null, 2));
  }

  return false;
}

// Main
(async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node test-api.js <deviceId> <command>');
    console.error('');
    console.error('Examples:');
    console.error('  node test-api.js 361177 on');
    console.error('  node test-api.js 361177 off');
    console.error('  node test-api.js 361177 status');
    console.error('  node test-api.js 361177 status --verbose');
    console.error('');
    console.error('Configuration:');
    console.error('  Create a .env.local file with:');
    console.error('    SIKOM_USERNAME=your-username');
    console.error('    SIKOM_PASSWORD=your-password');
    console.error('');
    process.exit(1);
  }

  const deviceId = parseInt(args[0], 10);
  const command = args[1].toLowerCase();
  const verbose = args.includes('--verbose');
  
  if (command !== 'on' && command !== 'off' && command !== 'status') {
    console.error('Error: command must be "on", "off", or "status"');
    process.exit(1);
  }

  try {
    if (command === 'status') {
      const found = await testDeviceStatus(deviceId, verbose);
      if (!found) {
        console.log('\n⚠️  Status test completed, but state could not be determined yet.\n');
        process.exit(2);
      }
    } else {
      const turnOn = command === 'on';
      await testDeviceControl(deviceId, turnOn);
    }
    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.log('\n❌ Test failed!\n');
    process.exit(1);
  }
})();
