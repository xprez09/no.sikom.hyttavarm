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
  const passwordToUse = config.useSuffix ? `${config.password}!!!` : config.password;
  const authHeader = `Basic ${Buffer.from(`${config.username}:${passwordToUse}`).toString('base64')}`;

  console.log('Request Details:');
  console.log('  URL:', url);
  console.log('  Method: GET');
  console.log('  Auth: Basic (username:', config.username + ', suffix: enabled)');
  console.log('  Headers:');
  console.log('    Authorization: Basic ***');
  console.log('    Content-Type: application/json');
  console.log('');

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

// Main
(async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node test-api.js <deviceId> <command>');
    console.error('');
    console.error('Examples:');
    console.error('  node test-api.js 361177 on');
    console.error('  node test-api.js 361177 off');
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
  
  if (command !== 'on' && command !== 'off') {
    console.error('Error: command must be "on" or "off"');
    process.exit(1);
  }

  const turnOn = command === 'on';

  try {
    await testDeviceControl(deviceId, turnOn);
    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.log('\n❌ Test failed!\n');
    process.exit(1);
  }
})();
