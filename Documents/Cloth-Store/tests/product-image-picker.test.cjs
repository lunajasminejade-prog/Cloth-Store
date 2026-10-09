const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { transformSync } = require('@babel/core');

// The system gallery and native image encoder cannot run in Node. Only those
// external boundaries are supplied; the production picker/validation runs here.
function loadPicker({ os = 'web', permission = true, selection, encodings = ['UElDVFVSRQ=='], processingError } = {}) {
  const asset = { uri: 'file:///selected.png', width: 2400, height: 4000, type: 'image', mimeType: 'image/png' };
  const modules = {
    'react-native': { Platform: { OS: os } },
    'expo-image-picker': {
      async requestMediaLibraryPermissionsAsync() {
        assert.notEqual(os, 'web', 'Browser upload must stay within its user click');
        return { granted: permission };
      },
      async launchImageLibraryAsync(options) {
        assert.ok(permission, 'Denied permission must stop before the gallery');
        assert.equal(JSON.stringify(options.mediaTypes), '["images"]');
        return selection || { canceled: false, assets: [asset] };
      },
    },
    'expo-image-manipulator': {
      SaveFormat: { PNG: 'png', JPEG: 'jpeg' },
      ImageManipulator: {
        manipulate(uri) {
          assert.equal(uri, asset.uri);
          if (processingError) throw processingError;
          return {
            resize(size) {
              assert.ok(size.height > 0 && size.height <= 960);
              assert.equal(size.width, undefined, 'Keep the original aspect ratio');
            },
            async renderAsync() {
              return {
                async saveAsync(options) {
                  assert.equal(options.base64, true);
                  assert.equal(options.format, 'png', 'Preserve PNG transparency');
                  return { uri: 'file:///processed.png', width: 576, height: 960, base64: encodings.shift() };
                },
                release() {},
              };
            },
            release() {},
          };
        },
      },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'avatar.js'), 'utf8');
  const code = transformSync(source, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => modules[name] });
  return module.exports;
}

test('product upload produces a persistent picture without cropping or losing PNG transparency', async () => {
  const api = loadPicker({ os: 'android' });
  const result = await api.pickProductImage?.();
  assert.equal(result?.dataUri, 'data:image/png;base64,UElDVFVSRQ==');
});

test('cancelling product upload leaves the picture unchanged', async () => {
  const result = await loadPicker({ selection: { canceled: true, assets: null } }).pickProductImage?.();
  assert.equal(result?.canceled, true);
  assert.equal(result?.dataUri, undefined);
});

test('denied gallery access and unsupported files return a recoverable error', async () => {
  const denied = await loadPicker({ os: 'android', permission: false }).pickProductImage?.();
  assert.ok(denied?.error);
  const invalid = await loadPicker({ selection: { canceled: false, assets: [{ uri: 'file:///video.mp4', type: 'video', mimeType: 'video/mp4' }] } }).pickProductImage?.();
  assert.ok(invalid?.error);
  assert.equal(invalid?.dataUri, undefined);
});

test('large product pictures are resized again before they reach device storage', async () => {
  const result = await loadPicker({ encodings: ['A'.repeat(1024 * 1024), 'U01BTEw='] }).pickProductImage?.();
  assert.equal(result?.dataUri, 'data:image/png;base64,U01BTEw=');
});

test('image processing failures report an error without changing the product', async () => {
  const result = await loadPicker({ processingError: new Error('Unable to decode picture') }).pickProductImage?.();
  assert.ok(result?.error);
  assert.equal(result?.dataUri, undefined);
});

test('the existing profile upload still preserves its picture format', async () => {
  const result = await loadPicker({ selection: { canceled: false, assets: [{ type: 'image', mimeType: 'image/png', base64: 'UFJPRklMRQ==' }] } }).pickProfileImage();
  assert.equal(result.dataUri, 'data:image/png;base64,UFJPRklMRQ==');
});
