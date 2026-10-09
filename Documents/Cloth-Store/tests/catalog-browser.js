import {
  initDatabase, fetchAllProducts, fetchAllVariants, fetchProducts,
  insertProduct, updateProduct, deleteProductRecord, deductVariantStock,
  restoreVariantStock, adjustVariantStock,
} from '../src/services/db';

// Run only on the isolated test origin, never on the user's localhost catalog.
if (location.hostname !== '127.0.0.1') throw new Error('Use the isolated 127.0.0.1 test origin.');

const results = [{ crossOriginIsolated, SharedArrayBuffer: typeof SharedArrayBuffer }];
const show = () => { document.getElementById('results').textContent = JSON.stringify(results, null, 2); };
const assert = (value, message) => { if (!value) throw new Error(message); };
show();
(async () => {
  let fixtureId;
  try {
    await initDatabase();
    // Remove only fixtures made by a previous interrupted run in this test origin.
    for (const product of await fetchAllProducts()) {
      if (product.name === 'SQLite verification fixture') await deleteProductRecord(product.id);
    }
    const before = await fetchAllProducts();
    assert(before.length >= 6, 'Seed catalog loads');
    assert(before[0].description.length > 40, 'Full product records arrive intact');
    results.push({ test: 'startup and full catalog', passed: true, products: before.length }); show();
    const filtered = await fetchProducts({ search: 'knit' });
    assert(filtered.length === 2, 'SQL search returns both knit products');
    results.push({ test: 'SQL search', passed: true }); show();

    fixtureId = await insertProduct({ name: 'SQLite verification fixture', category: 'Shirts', price: 123, stock: 36 });
    await updateProduct(fixtureId, { description: 'Saved test description' });
    let variants = (await fetchAllVariants())[fixtureId];
    const variant = variants.find(v => v.size === 'M' && v.color === 'Lavender');
    await adjustVariantStock(fixtureId, variant.size, variant.color, 1);
    let product = (await fetchAllProducts()).find(p => p.id === fixtureId);
    assert(product.description === 'Saved test description' && product.stock === 37, 'Product edits and aggregate stock persist');
    const line = { productId: fixtureId, size: variant.size, color: variant.color, qty: 1 };
    await deductVariantStock([line]);
    assert((await fetchAllProducts()).find(p => p.id === fixtureId).stock === 36, 'Checkout deducts stock');
    await restoreVariantStock([line]);
    try {
      await deductVariantStock([line, { ...line, size: 'XS', qty: 1000 }]);
      throw new Error('Shortage was accepted');
    } catch (error) { assert(error.message.includes('Not enough stock'), 'Shortage rejected'); }
    assert((await fetchAllProducts()).find(p => p.id === fixtureId).stock === 37, 'Failed checkout rolls back');
    await initDatabase();
    assert((await fetchAllProducts()).find(p => p.id === fixtureId).stock === 37, 'Initialization preserves stored product');
    await deleteProductRecord(fixtureId);
    fixtureId = undefined;
    assert((await fetchAllProducts()).length === before.length, 'Fixture removed without changing existing catalog');
    results.push({ test: 'CRUD, inventory, checkout, rollback, existing-data preservation', passed: true });
    results.push({ complete: true, passed: true });
  } catch (error) {
    results.push({ complete: true, passed: false, error: error.message });
  } finally {
    if (fixtureId !== undefined) await deleteProductRecord(fixtureId).catch(() => {});
    show();
  }
})();
