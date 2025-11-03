# Changelog

All notable changes to this project will be documented in this file.

## [2.0.4] - 2025-11-03

### Added
- **Standalone Test Script**: Created `test-api.js` for testing Device endpoint before Homey deployment
  - Reads credentials from `.env.local` file
  - Tests both ON/OFF commands independently
  - Validates `bpapi_status` responses
  - Detailed request/response logging
- **Test Documentation**: Added `TEST-API.md` guide and `.env.local.example` template

### Changed
- **Settings UI Simplified**: Removed gateway field from settings interface (not required for Device endpoint)
  - Only username and password fields remain
  - Added hint that `!!!` suffix is automatically appended
- **Authentication Hardcoded**: Password suffix (`!!!`) now always appended in both `app.ts` and `app.js` (no longer optional/configurable)

### Fixed
- **Settings JavaScript**: Cleaned up gateway loading/saving logic from settings page
- **Documentation**: Updated README configuration section to reflect automatic suffix and removed gateway requirement

## [2.0.3] - 2025-10-30

### Changed
- **Endpoint Clarification**: Reverted to authoritative Device endpoint `Device/{id}/AddProperty/switch_mode/{0|1}/` for on/off control; removed experimental Gateway `ControlGroupByID` usage.
- **Authentication**: Password suffix (`!!!`) is now always appended as required by the BPAPI.
- **Flow Action Arguments**: Ensured `groupId` numeric validation and consistent logging.
- **TypeScript Unification**: Core logic now lives in `app.ts` (ES2019+ features); legacy `app.js` retained only for compatibility but points to Device endpoint.
- **Dependencies**: Removed `node-fetch` in favor of Node.js global `fetch` (Node ≥18).
- **Dependencies**: Removed `@types/node-fetch` from devDependencies.

### Added
- **Logging**: Detailed API logging (URL, status, elapsed time, truncated body) for Device switch_mode requests.
- **Dependency Overrides**: npm overrides for `brace-expansion`, `form-data`, `tar-fs`, `tmp`, and `got` to reduce transitive vulnerabilities.
- **Engine Constraints**: Declared `node >= 18` in `package.json` engines.
- **Validation**: Runtime validation for `groupId` argument in Flow actions.

### Removed
- **Gateway Requirement**: Gateway ID no longer required for group control; configuration references eliminated.
- **Fallback Logic**: Removed Gateway fallback code—only Device switch_mode endpoint is invoked.

### Fixed
- **Sharp Optional Binaries**: Stub directories for `@img/sharp-darwin-x64` and `@img/sharp-libvips-darwin-x64` to bypass Homey CLI preprocessing ENOENT errors on Apple Silicon.
- **Docker Socket**: Documented symlink requirement for Rancher Desktop users (`/var/run/docker.sock` → `~/.rd/docker.sock`).

### Security
- **Vulnerabilities Reduced**: Eliminated 11 critical/high severity vulnerabilities via overrides.
- **Remaining Issues**: 5 moderate severity `parseuri` vulnerabilities (transitive via `homey-api` → `homey`); require upstream package update.

## [2.0.2] - (Previous Version)

Initial version with Flow actions for controlling Sikom device groups.
