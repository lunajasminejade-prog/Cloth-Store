const { createRequire } = require('node:module');

function setSqliteWebHeaders(res) {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

// SDK 57 serves the single-page HTML from ManifestMiddleware before Metro's
// enhanceMiddleware. Apply the same headers there too. This runs only in Node
// when loading Metro config; no dependency files or native handlers are changed.
// Keep the live HTTP regression test when upgrading Expo: this is a CLI shim.
function installSqliteWebHeaders() {
  const expoRequire = createRequire(require.resolve('expo/package.json'));
  const { ManifestMiddleware } = expoRequire(
    '@expo/cli/build/src/start/server/middleware/ManifestMiddleware',
  );
  const marker = Symbol.for('clothstore.sqliteWebHeaders');
  const prototype = ManifestMiddleware.prototype;
  if (prototype[marker]) return;

  const handleWebRequestAsync = prototype.handleWebRequestAsync;
  prototype.handleWebRequestAsync = function (req, res) {
    setSqliteWebHeaders(res);
    return handleWebRequestAsync.call(this, req, res);
  };
  prototype[marker] = true;
}

module.exports = { installSqliteWebHeaders, setSqliteWebHeaders };
