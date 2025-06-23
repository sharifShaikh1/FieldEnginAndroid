// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This is the important line that fixes the axios issue
config.resolver.sourceExts.push('cjs');

module.exports = config;