const assert = require('node:assert/strict');
const test = require('node:test');

const origin = process.env.CLOTH_STORE_TEST_URL || 'http://localhost:8081';

test('the web document enables SharedArrayBuffer for the SQLite worker', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(response.headers.get('cross-origin-embedder-policy'), 'credentialless');
  assert.match(await response.text(), /index\.bundle\?platform=web/);
});

test('Android still receives its Expo Go manifest', async () => {
  const response = await fetch(origin, {
    headers: { 'expo-platform': 'android', accept: 'application/expo+json' },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/expo\+json/);
  const manifest = await response.json();
  assert.ok(manifest.launchAsset.url.includes('platform=android'));
  assert.equal(manifest.extra.expoClient.name, 'Cloth Store');
});
