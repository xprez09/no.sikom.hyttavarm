#!/usr/bin/env bash
# Helper script to run Homey app with proper setup

cd "$(dirname "$0")"

echo "Creating Sharp stubs..."
mkdir -p node_modules/@img/sharp-darwin-x64/lib
mkdir -p node_modules/@img/sharp-libvips-darwin-x64/lib

echo '{"name":"@img/sharp-darwin-x64","version":"0.33.5","os":["darwin"],"cpu":["x64"],"main":"lib/index.js"}' > node_modules/@img/sharp-darwin-x64/package.json
echo 'module.exports = {}' > node_modules/@img/sharp-darwin-x64/lib/index.js
echo '{"name":"@img/sharp-libvips-darwin-x64","version":"1.0.4","os":["darwin"],"cpu":["x64"]}' > node_modules/@img/sharp-libvips-darwin-x64/package.json

echo "Running Homey app..."
homey app run
