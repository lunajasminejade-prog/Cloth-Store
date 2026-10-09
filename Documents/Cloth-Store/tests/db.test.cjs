const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { transformSync } = require('@babel/core');

function loadProductImages() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'products.js'), 'utf8');
  const code = transformSync(source, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  // Metro resolves bundled PNGs; use their filenames as stable asset handles in Node.
  vm.runInNewContext(code, { module, exports: module.exports, require: (asset) => asset });
  return module.exports;
}

function loadOrderPictures(db) {
  const file = path.join(__dirname, '..', 'src', 'services', 'orderPictures.js');
  assert.ok(fs.existsSync(file), 'Order pictures must be stored outside the small order-history entry');
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => db });
  return module.exports;
}

test('product pictures preserve bundled assets and reject arbitrary remote references', () => {
  const { imageForKey } = loadProductImages();
  assert.equal(imageForKey('knit-shirt'), '../../assets/products/knit-shirt.png');
  for (const value of [null, '', 'missing', 'https://example.com/tracker.png']) {
    assert.equal(imageForKey(value), '../../assets/products/hoodie-purple.png');
  }
});

// Expo's native module cannot run in Node. This adapter executes the production
// database service against real SQLite, with every database kept in memory.
function loadService(file) {
  const engine = new DatabaseSync(':memory:');
  let failSql = null;
  const database = {
    execSync(sql) { engine.exec(sql); },
    getFirstSync(sql, params = []) { return engine.prepare(sql).get(...params) || null; },
    getAllSync(sql, params = []) { return engine.prepare(sql).all(...params); },
    runSync(sql, params = []) {
      if (failSql && failSql.test(sql)) {
        failSql = null;
        throw new Error('Interrupted database write');
      }
      const result = engine.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
  };
  for (const method of ['exec', 'getFirst', 'getAll', 'run']) {
    database[`${method}Async`] = async (...args) => database[`${method}Sync`](...args);
  }
  const suppliedSQLite = {
    openDatabaseSync(name) { assert.equal(name, 'clothstore.db'); return database; },
    async openDatabaseAsync(name) { assert.equal(name, 'clothstore.db'); return database; },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', file), 'utf8')
    .replace("import * as SQLite from 'expo-sqlite';", 'const SQLite = suppliedSQLite;');
  const code = transformSync(source, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, suppliedSQLite }, { filename: file });
  return { service: module.exports, close: () => engine.close(), failNextWriteMatching: (sql) => { failSql = sql; } };
}

test('web: interrupted seeding leaves no partial catalog and can retry', async () => {
  const { service: db, close, failNextWriteMatching } = loadService('db.web.js');
  try {
    failNextWriteMatching(/INSERT INTO variants/);
    await assert.rejects(db.initDatabase(), /Interrupted database write/);
    assert.equal((await db.fetchAllProducts()).length, 0);
    await db.initDatabase();
    assert.equal((await db.fetchAllProducts()).length, 6);
  } finally { close(); }
});

test('web: interrupted product insert and reset preserve the saved catalog', async () => {
  const { service: db, close, failNextWriteMatching } = loadService('db.web.js');
  try {
    await db.initDatabase();
    const products = await db.fetchAllProducts();
    await db.updateProduct(products[0].id, { name: 'Saved custom product' });
    const stock = products.reduce((sum, p) => sum + p.stock, 0);
    failNextWriteMatching(/INSERT INTO variants/);
    await assert.rejects(db.insertProduct({ name: 'Incomplete product', category: 'Shirts', price: 50, stock: 36 }), /Interrupted database write/);
    assert.equal((await db.fetchAllProducts()).length, 6);
    failNextWriteMatching(/INSERT INTO variants/);
    await assert.rejects(db.resetCatalogToSeed(), /Interrupted database write/);
    const after = await db.fetchAllProducts();
    assert.equal(after[0].name, 'Saved custom product');
    assert.equal(after.reduce((sum, p) => sum + p.stock, 0), stock);
    assert.equal((await db.fetchVariants(products[0].id)).length, 18);
  } finally { close(); }
});

for (const file of ['db.js', 'db.web.js']) {
  test(`${file}: saved order photos stay outside order metadata and survive product deletion`, async () => {
    const { service: db, close } = loadService(file);
    try {
      const { prepareOrderPictures, serializeOrders, hydrateOrderPictures } = loadOrderPictures(db);
      await db.initDatabase();
      const picture = 'data:image/png;base64,' + 'ABCD'.repeat(153600);
      const productId = await db.insertProduct({ name: 'Order photo test', category: 'Shirts', price: 100, stock: 36, imageKey: picture });
      const line = { productId, name: 'Order photo test', price: 100, imageKey: picture, image: { uri: picture }, size: 'M', color: 'Lavender', qty: 1 };
      const order = await prepareOrderPictures({ id: 'CS-PHOTO-TEST', items: [line, { ...line, size: 'L' }], total: 200 });
      const stored = serializeOrders([order, { ...order, status: 'Cancelled' }]);
      assert.ok(stored.length < 2000, 'Order metadata must stay small even with large product photos');
      assert.ok(!stored.includes('base64,'));
      await db.deleteProductRecord(productId);
      await db.initDatabase();
      const restored = await hydrateOrderPictures(JSON.parse(stored));
      assert.ok(restored[0].items[0].image.uri === picture, 'Saved photo is restored after its product is deleted');
      assert.equal(restored[0].items[1].image.uri, picture);
      assert.equal(restored[1].status, 'Cancelled');
      assert.ok(serializeOrders(restored).length < 2000);
    } finally { close(); }
  });

  test(`${file}: missing saved order pictures do not prevent history from loading`, async () => {
    const { service: db, close } = loadService(file);
    try {
      const { hydrateOrderPictures } = loadOrderPictures(db);
      await db.initDatabase();
      const raw = [{ id: 'CS-MISSING', items: [{ productId: 123, name: 'Saved shirt', imageKey: 'order-picture:missing:123', qty: 1 }] }];
      const orders = await hydrateOrderPictures(raw);
      assert.equal(orders[0].items[0].name, 'Saved shirt');
      assert.equal(orders[0].items[0].imageKey, 'order-picture:missing:123');
    } finally { close(); }
  });

  test(`${file}: an uploaded product picture is displayed after saving and reinitializing`, async () => {
    const { service: db, close } = loadService(file);
    const { imageForKey } = loadProductImages();
    const originalPicture = 'data:image/png;base64,' + 'ABCD'.repeat(4096);
    const replacementPicture = 'data:image/jpeg;base64,' + 'EFGH'.repeat(4096);
    try {
      await db.initDatabase();
      const id = await db.insertProduct({ name: 'Picture test shirt', category: 'Shirts', price: 100, stock: 36, imageKey: originalPicture });
      await db.initDatabase();
      let product = await db.fetchProductById(id);
      assert.equal(imageForKey(product.imageKey).uri, originalPicture);
      await db.updateProduct(id, { imageKey: replacementPicture });
      await db.initDatabase();
      product = await db.fetchProductById(id);
      assert.equal(imageForKey(product.imageKey).uri, replacementPicture);
      assert.equal(product.stock, 36);
      assert.equal((await db.fetchAllProducts())[0].imageKey, 'hoodie-purple');
    } finally { close(); }
  });

  test(`${file}: initialization preserves saved products and an intentionally empty catalog`, async () => {
    const { service: db, close } = loadService(file);
    try {
      await db.initDatabase();
      const products = await db.fetchAllProducts();
      assert.equal(products.length, 6);
      await db.updateProduct(products[0].id, { name: 'Saved custom name' });
      assert.equal(await db.initDatabase(), false);
      assert.equal((await db.fetchAllProducts())[0].name, 'Saved custom name');
      for (const product of products) await db.deleteProductRecord(product.id);
      await db.initDatabase();
      assert.equal((await db.fetchAllProducts()).length, 0);
    } finally { close(); }
  });

  test(`${file}: CRUD, SQL search and stock transactions preserve inventory`, async () => {
    const { service: db, close } = loadService(file);
    try {
      await db.initDatabase();
      const id = await db.insertProduct({ name: "Test's Shirt", category: 'Shirts', price: 123, stock: 36 });
      assert.equal((await db.fetchProductById(id)).stock, 36);
      await db.updateProduct(id, { name: 'Edited Shirt', description: 'Updated description' });
      assert.equal((await db.fetchProducts({ search: 'Edited' }))[0].description, 'Updated description');
      assert.equal((await db.fetchProducts({ search: "' OR 1=1 --" })).length, 0);
      const line = { productId: id, size: 'M', color: 'Lavender', qty: 1 };
      await db.deductVariantStock([line]);
      assert.equal((await db.fetchProductById(id)).stock, 35);
      await db.restoreVariantStock([line]);
      await assert.rejects(async () => await db.deductVariantStock([line, { ...line, size: 'XS', qty: 1000 }]), /Not enough stock/);
      assert.equal((await db.fetchProductById(id)).stock, 36);
      await Promise.all(Array.from({ length: 8 }, () => db.adjustVariantStock(id, 'M', 'Lavender', 1)));
      assert.equal((await db.fetchProductById(id)).stock, 44);
      await db.deleteProductRecord(id);
      assert.equal(await db.fetchProductById(id), null);
      assert.equal((await db.fetchVariants(id)).length, 0);
    } finally { close(); }
  });
}
