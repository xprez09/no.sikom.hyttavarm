# hyttavarm

App for å skru på og av Sikom anlegg

## Quick Start

### Prerequisites

- **Node.js**: v18 or higher required (v24+ recommended)
- **Docker**: Required for remote debugging via Homey CLI
  - Docker Desktop or Rancher Desktop
  - Symlink `/var/run/docker.sock` to your Docker socket if using Rancher Desktop:
    ```fish
    sudo ln -s ~/.rd/docker.sock /var/run/docker.sock
    ```
- **Homey CLI**: Install globally
  ```fish
  npm install -g homey
  ```

### Installation

```fish
npm install
```

### Running the App

Build TypeScript and run the app in Homey's remote debug environment:

```fish
npm run build
homey app run
```

The app will compile TypeScript, preprocess assets, and launch a remote debug session. Flow actions can be triggered from the Homey app or web interface.

### Configuration

Configure credentials via the app settings page:
- **Username**: API username
- **Password**: API password (the required `!!!` suffix is automatically appended)

Find your credentials reference page at: https://api.connome.com/api/Summary/HTML

### Controlling Devices

The app sends a GET request to the Sikom BPAPI endpoint:

```
https://api.connome.com/api/Device/{deviceId}/AddProperty/switch_mode/{1|0}/
```

Where:
- `deviceId` is the numeric ID you supply in the Flow action.
- `1` turns the device/group ON.
- `0` turns the device/group OFF.

Expected JSON success responses include `Data.bpapi_status` of `ok` or `success`. Any other status will raise an error in logs.

## Security & Dependencies

### Current Status

As of version 2.0.3, this app has significantly reduced security vulnerabilities:

- **Eliminated**: 11 critical and high severity vulnerabilities through dependency overrides
- **Remaining**: 5 moderate severity vulnerabilities from `parseuri` package (transitive dependency via `homey-api` → `homey`)

### Dependency Overrides

The following npm overrides are in place to mitigate vulnerabilities in transitive dependencies:

```json
{
  "brace-expansion": "^2.0.1",
  "form-data": "^4.0.4",
  "tar-fs": "^2.1.4",
  "tmp": "^0.2.4",
  "got": "^11.8.5"
}
```

### Upgrade Path

To fully resolve remaining `parseuri` vulnerabilities:

1. Monitor for `homey` package updates that include updated `homey-api` with fixed dependencies
2. When available, upgrade `homey` to latest major version:
   ```fish
   npm install homey@latest
   npm audit --production
   ```
3. Test thoroughly after upgrade as it may include breaking changes

Run security audit anytime:

```fish
npm audit --production --omit=dev
```

## Maintenance Notes

### Sharp Optional Binary Workaround

This project includes stub directories for Sharp's x64 binaries to prevent Homey CLI preprocessing errors on Apple Silicon:

- `node_modules/@img/sharp-darwin-x64/`
- `node_modules/@img/sharp-libvips-darwin-x64/`

These stubs satisfy the CLI's lstat checks but are not functional binaries. They can be removed once:

1. Sharp stops declaring x64 optional dependencies for arm64 builds, OR
2. Homey CLI preprocessing is updated to skip missing optional binaries

**Recreate stubs after `npm install`** if needed:

```fish
mkdir -p node_modules/@img/sharp-darwin-x64/lib
echo '{"name":"@img/sharp-darwin-x64","version":"0.0.0-stub"}' > node_modules/@img/sharp-darwin-x64/package.json
echo "Stub placeholder" > node_modules/@img/sharp-darwin-x64/README.md

mkdir -p node_modules/@img/sharp-libvips-darwin-x64/lib
echo '{"name":"@img/sharp-libvips-darwin-x64","version":"0.0.0-stub"}' > node_modules/@img/sharp-libvips-darwin-x64/package.json
echo "Stub placeholder" > node_modules/@img/sharp-libvips-darwin-x64/README.md
```

### Version Management

- **package.json version**: Semantic versioning for npm package
- **app.json version**: Homey app store version (must stay in sync)

When releasing, update both files to match.

## UI Testing (Playwright)

This project uses [Playwright](https://playwright.dev) to test the settings HTML view in isolation.

### Install browsers

```fish
npm install
npx playwright install
```

### Run tests

```fish
npm test
```

Run the interactive UI mode:

```fish
npm run test:ui
```

### Code generation

Open a browser and record actions to generate test code:

```fish
npm run codegen
```

### How it works

`playwright.config.ts` starts a lightweight static file server (port 5173) and the test `tests/settings.spec.ts` mocks `homey.js`, providing the minimal `Homey` API used by the settings page.

### Adjusting the mock

If the settings view starts using more of the Homey SDK, extend the mock inside the route handler in `tests/settings.spec.ts`.

### Traces

On a failed test Playwright will collect a trace (see `test-results/`). Open it with:

```fish
npx playwright show-trace test-results/<trace.zip>
```

### Lint & TypeScript

Keep tests typed; feel free to convert specs to TypeScript as needed (already using TS). Run lint:

```fish
npm run lint
```