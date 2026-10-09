const { getDefaultConfig } = require('expo/metro-config');

const { installSqliteWebHeaders, setSqliteWebHeaders } = require('./scripts/sqlite-web-headers.cjs');

const config = getDefaultConfig(__dirname);

// SQLite Web support
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Expo's HTML handler runs before Metro's middleware in SDK 57.
installSqliteWebHeaders();

// Browser security headers for SQLite worker bundles and WASM assets.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    setSqliteWebHeaders(res);
    return middleware(req, res, next);
  };
};

module.exports = config;
