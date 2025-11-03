# API Testing Guide

This guide helps you test the Sikom BPAPI endpoint independently before deploying to Homey.

## Quick Start

### 1. Set up credentials

Create a `.env.local` file:

```fish
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual credentials:

```
SIKOM_USERNAME=your-actual-username
SIKOM_PASSWORD=your-actual-password
```

**Note:** The `!!!` suffix is automatically appended to the password as required by the API.

### 2. Run the test

```fish
# Test turning device ON
node test-api.js 361177 on

# Test turning device OFF
node test-api.js 361177 off
```

Replace `361177` with your actual device/group ID.

## What to Look For

### ✅ Success Response

You should see:
```
Response:
  Status: 200 OK
  Time: ~500ms
  
BPAPI Status: ok
✅ SUCCESS - Device 361177 turned ON
```

### ❌ Error Responses

**Authentication Error (401)**
```
❌ HTTP Error: 401 Unauthorized
```
→ Check your username/password in `.env.local`.

**Client Error (bpapi_status: client_error)**
```
BPAPI Status: client_error
BPAPI Message: Your query was not understood...
❌ API Error - Non-success status: client_error
```
→ The device ID might be wrong, or the endpoint doesn't support your resource type.

**Wrong Device ID**
```
BPAPI Status: error
BPAPI Message: Device not found or access denied
```
→ Verify the device ID at https://api.connome.com/api/Summary/HTML

## Finding Your Device ID

1. Visit: https://api.connome.com/api/Summary/HTML
2. Log in with your credentials
3. Look for your device/group in the list
4. Note the numeric ID (e.g., `361177`)

## Troubleshooting

### "Invalid deviceId - must be a number"
Make sure you're passing a numeric ID:
```fish
node test-api.js 361177 on  # ✅ Correct
node test-api.js "my-device" on  # ❌ Wrong
```

### "Please configure username/password"
Create or check your `.env.local` file with valid credentials.

### Response shows different URL
If the API response mentions a different URL (like Gateway/ControlGroupByID), that's a server-side redirect/error message. Your request is correctly going to the Device endpoint - check the "Request Details" section in the output to confirm.

### Testing with curl

You can also test directly with curl:

```fish
# Turn ON (1)
curl -v -X GET \
  -H "Authorization: Basic (base64 of username:password)" \
  -H "Content-Type: application/json" \
  "https://api.connome.com/api/Device/361177/AddProperty/switch_mode/1/"

# Turn OFF (0)
curl -v -X GET \
  -H "Authorization: Basic (base64 of username:password)" \
  -H "Content-Type: application/json" \
  "https://api.connome.com/api/Device/361177/AddProperty/switch_mode/0/"
```

Generate Base64 auth:
```fish
echo -n "username:password" | base64
```

## Next Steps

Once the test succeeds:
1. The same endpoint/logic is implemented in `app.ts`
2. Deploy to Homey with `homey app run`
3. The Flow actions will use identical request logic
