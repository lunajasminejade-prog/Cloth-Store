// Offline-first product database for Cloth Store (expo-sqlite).
// Products, aggregate stock, and size/color variant inventory live in SQLite.
// Auxiliary preferences (cart, wishlist, orders, profile, settings) stay in
// AsyncStorage under separate versioned keys (see store/ShopContext.js).
//
// Web uses async worker messages to avoid cold-start sync timeouts and truncated
// synchronous result buffers. Keep the database name, schema and seed flag aligned
// with db.js, which retains the native synchronous implementation.
import * as SQLite from 'expo-sqlite';
const DB_NAME = 'clothstore.db';
const SEED_FLAG = 'seeded_v1';
let db = null;
let opening = null;
let initError = null;
export async function getDb() {
  if (!db) {
    if (!opening) {
      opening = SQLite.openDatabaseAsync(DB_NAME)
        .then((value) => { db = value; return value; })
        .finally(() => { opening = null; });
    }
    await opening;
  }
  return db;
}
export function getInitError() {
  return initError;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
async function createSchema(d) {
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      imageKey TEXT NOT NULL DEFAULT 'hoodie-purple',
      categories TEXT NOT NULL DEFAULT '[]',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      available INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      UNIQUE(product_id, size, color)
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_images (
      key TEXT PRIMARY KEY,
      dataUri TEXT NOT NULL
    );
  `);
}
async function enableWal(d) {
  try {
    await d.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // Web and some platforms do not support WAL; ignore.
  }
  try {
    await d.execAsync('PRAGMA foreign_keys = ON;');
  } catch {
    // Non-fatal.
  }
}

// ---------------------------------------------------------------------------
// Seed input: static data used ONLY as first-run seed input.
// The live catalog is always read from SQLite, never from this array.
// Names, prices, images, and display order match the existing Cloth Store
// catalog (supplied Figma Home frame reference).
// ---------------------------------------------------------------------------
export const SEED_PRODUCTS = [{
  name: "Men's Pullover Hoodie",
  category: 'Trending',
  categories: ['Trending', 'Shirts'],
  price: 1999,
  imageKey: 'hoodie-purple',
  description: 'Soft cotton fleece with a relaxed fit. Your everyday layer for effortless comfort.'
}, {
  name: 'Relaxed Knit Shirt',
  category: 'Trending',
  categories: ['Trending', 'Shirts'],
  price: 1499,
  imageKey: 'knit-shirt',
  description: 'Breathable knit polo with a soft hand feel. Smart enough for evenings out.'
}, {
  name: 'Everyday Hoodie',
  category: 'Trending',
  categories: ['Trending', 'Shirts'],
  price: 1999,
  imageKey: 'hoodie-purple',
  description: 'Brushed-back fleece hoodie with kangaroo pocket. A closet staple in lavender.'
}, {
  name: 'Essential Shirt',
  category: 'Trending',
  categories: ['Trending', 'Shirts'],
  price: 999,
  imageKey: 'essential-shirt',
  description: 'Lightweight everyday shirt with a clean cut. Pairs with anything you own.'
}, {
  name: 'Weekend Knit Polo',
  category: 'Shirts',
  categories: ['Shirts'],
  price: 1299,
  imageKey: 'knit-shirt',
  description: 'Textured knit polo with ribbed trims. Easy comfort for the weekend.'
}, {
  name: 'Cloud Fleece Hoodie',
  category: 'Shirts',
  categories: ['Shirts'],
  price: 2199,
  imageKey: 'hoodie-purple',
  description: 'Extra-soft fleece with a roomy hood. Warmth without the weight.'
}];
export const SEED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const SEED_COLORS = ['Lavender', 'Deep Plum', 'Cloud'];

// Clearly defined demo stock values (not live inventory).
// Most variants get 8 units; a deterministic subset is low (2) so the
// Inventory screen and disabled states have something real to show.
function seedVariantStock(productIdx, sizeIdx, colorIdx) {
  if (productIdx === 5 && sizeIdx === 5 && colorIdx === 2) return 0; // one sold-out demo variant
  return (productIdx + sizeIdx + colorIdx) % 5 === 0 ? 2 : 8;
}
async function insertSeedProduct(d, seed, sortOrder) {
  const res = await d.runAsync('INSERT INTO products (name, category, price, stock, description, imageKey, categories, sortOrder, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)', [seed.name, seed.category, seed.price, 0, seed.description, seed.imageKey, JSON.stringify(seed.categories), sortOrder, new Date().toISOString()]);
  const productId = Number(res.lastInsertRowId);
  let total = 0;
  for (const [si, size] of SEED_SIZES.entries()) {
    for (const [ci, color] of SEED_COLORS.entries()) {
      const stock = seedVariantStock(sortOrder, si, ci);
      await d.runAsync('INSERT INTO variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)', [productId, size, color, stock]);
      total += stock;
    }
  }
  await d.runAsync('UPDATE products SET stock = ? WHERE id = ?', [total, productId]);
  return productId;
}
async function seedIfNeeded(d) {
  const flag = await d.getFirstAsync('SELECT value FROM meta WHERE key = ?', [SEED_FLAG]);
  if (flag && flag.value) return false; // seeded before: never reseed (even if empty)
  const countRow = await d.getFirstAsync('SELECT COUNT(*) AS n FROM products');
  if (countRow && Number(countRow.n) > 0) {
    await d.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
    return false;
  }
  for (const [i, seed] of SEED_PRODUCTS.entries()) {
    await insertSeedProduct(d, seed, i);
  }
  await d.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
  return true;
}

// Initialize the database and seed the catalog exactly once.
// An explicit confirmed demo reset (resetCatalogToSeed) is the only path
// that restores the seed catalog afterwards.
async function initDatabaseImpl() {
  const d = await getDb();
  await enableWal(d);
  await createSchema(d);
  return withWriteTransaction(() => seedIfNeeded(d));
}

// Explicit confirmed demo reset: wipe catalog + variants, then re-seed.
// Saved order photos are cleared too: reset also clears order history,
// so no order can reference them afterwards.
async function resetCatalogToSeedImpl() {
  const d = await getDb();
  await d.execAsync('DELETE FROM variants;');
  await d.execAsync('DELETE FROM products;');
  await d.execAsync('DELETE FROM order_images;');
  await d.runAsync('DELETE FROM meta WHERE key = ?', [SEED_FLAG]);
  for (const [i, seed] of SEED_PRODUCTS.entries()) {
    await insertSeedProduct(d, seed, i);
  }
  await d.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------
export function mapProduct(row) {
  if (!row) return null;
  let categories = [];
  try {
    const parsed = JSON.parse(row.categories || '[]');
    if (Array.isArray(parsed)) categories = parsed;
  } catch {
    categories = row.category ? [row.category] : [];
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    categories,
    price: Number(row.price),
    stock: Number(row.stock),
    description: String(row.description || ''),
    imageKey: String(row.imageKey || 'hoodie-purple'),
    sortOrder: Number(row.sortOrder ?? 0),
    available: Number(row.available ?? 1) === 1,
    createdAt: String(row.createdAt || '')
  };
}

// ---------------------------------------------------------------------------
// Queries — search uses parameterized WHERE ... LIKE ? with bound values.
// ---------------------------------------------------------------------------
export async function fetchProducts({
  search = '',
  category = 'All',
  sort = 'featured',
  maxPrice = 'all'
} = {}) {
  const d = await getDb();
  const where = [];
  const params = [];
  const q = String(search || '').trim();
  if (q) {
    const like = `%${q}%`;
    where.push('(name LIKE ? OR description LIKE ? OR category LIKE ? OR categories LIKE ?)');
    params.push(like, like, like, like);
  }
  if (category && category !== 'All') {
    where.push('(category = ? OR categories LIKE ?)');
    params.push(category, `%${category}%`);
  }
  if (maxPrice !== 'all') {
    const cap = Number(maxPrice);
    if (Number.isFinite(cap)) {
      where.push('price < ?');
      params.push(cap);
    }
  }
  let orderBy = 'sortOrder ASC, id ASC';
  if (sort === 'low') orderBy = 'price ASC, sortOrder ASC';else if (sort === 'high') orderBy = 'price DESC, sortOrder ASC';else if (sort === 'name') orderBy = 'name ASC';
  const sql = `SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
  return (await d.getAllAsync(sql, params)).map(mapProduct);
}
export async function fetchProductById(id) {
  const d = await getDb();
  return mapProduct(await d.getFirstAsync('SELECT * FROM products WHERE id = ?', [Number(id)]));
}
export async function fetchAllProducts() {
  return await fetchProducts({});
}
export async function fetchVariants(productId) {
  const d = await getDb();
  return await d.getAllAsync('SELECT size, color, stock FROM variants WHERE product_id = ? ORDER BY size, color', [Number(productId)]);
}
export async function fetchAllVariants() {
  const d = await getDb();
  const rows = await d.getAllAsync('SELECT product_id AS productId, size, color, stock FROM variants');
  const map = {};
  for (const r of rows) {
    const pid = Number(r.productId);
    if (!map[pid]) map[pid] = [];
    map[pid].push({
      size: String(r.size),
      color: String(r.color),
      stock: Number(r.stock)
    });
  }
  return map;
}
export async function getLowStockProducts(threshold = 10) {
  const d = await getDb();
  return (await d.getAllAsync('SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC, sortOrder ASC', [Number(threshold)])).map(mapProduct);
}

// ---------------------------------------------------------------------------
// Mutations — all parameterized; stock can never go negative.
// ---------------------------------------------------------------------------
export async function syncAggregateStock(d, productId) {
  const row = await d.getFirstAsync('SELECT COALESCE(SUM(stock), 0) AS total FROM variants WHERE product_id = ?', [Number(productId)]);
  const total = Number(row ? row.total : 0);
  await d.runAsync('UPDATE products SET stock = ?, available = CASE WHEN ? > 0 AND available = 0 THEN available ELSE CASE WHEN ? > 0 THEN available ELSE 0 END END WHERE id = ?', [total, total, total, Number(productId)]);
  // Auto-hide products with zero aggregate stock; re-enabling is manual.
  return total;
}
async function insertProductImpl({
  name,
  category,
  price,
  stock,
  description = '',
  imageKey = 'hoodie-purple',
  categories = null
}) {
  const d = await getDb();
  const total = Math.max(0, Math.floor(Number(stock)));
  const cats = Array.isArray(categories) && categories.length ? categories : [category];
  const orderRow = await d.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextOrder FROM products');
  const sortOrder = Number(orderRow ? orderRow.nextOrder : 0);
  const res = await d.runAsync('INSERT INTO products (name, category, price, stock, description, imageKey, categories, sortOrder, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name.trim(), category, Number(price), 0, String(description || ''), imageKey, JSON.stringify(cats), sortOrder, total > 0 ? 1 : 0, new Date().toISOString()]);
  const productId = Number(res.lastInsertRowId);
  // Distribute initial stock evenly across all size/color variants so the
  // aggregate stays consistent and every variant starts purchasable.
  const cells = SEED_SIZES.length * SEED_COLORS.length;
  const per = Math.floor(total / cells);
  let remainder = total - per * cells;
  for (const size of SEED_SIZES) {
    for (const color of SEED_COLORS) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      await d.runAsync('INSERT INTO variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)', [productId, size, color, per + extra]);
    }
  }
  await syncAggregateStock(d, productId);
  return productId;
}
async function updateProductImpl(id, {
  name,
  category,
  price,
  description,
  imageKey,
  categories,
  available
}) {
  const d = await getDb();
  const sets = [];
  const params = [];
  if (name !== undefined) {
    sets.push('name = ?');
    params.push(String(name).trim());
  }
  if (category !== undefined) {
    sets.push('category = ?');
    params.push(category);
  }
  if (price !== undefined) {
    sets.push('price = ?');
    params.push(Number(price));
  }
  if (description !== undefined) {
    sets.push('description = ?');
    params.push(String(description));
  }
  if (imageKey !== undefined) {
    sets.push('imageKey = ?');
    params.push(imageKey);
  }
  if (categories !== undefined) {
    sets.push('categories = ?');
    params.push(JSON.stringify(categories));
  }
  if (available !== undefined) {
    sets.push('available = ?');
    params.push(available ? 1 : 0);
  }
  if (!sets.length) return;
  params.push(Number(id));
  await d.runAsync(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
}
async function deleteProductRecordImpl(id) {
  const d = await getDb();
  await d.execAsync('BEGIN;');
  try {
    await d.runAsync('DELETE FROM variants WHERE product_id = ?', [Number(id)]);
    await d.runAsync('DELETE FROM products WHERE id = ?', [Number(id)]);
    await d.execAsync('COMMIT;');
  } catch (e) {
    try {
      await d.execAsync('ROLLBACK;');
    } catch {}
    throw e;
  }
}
async function setVariantStockImpl(productId, size, color, value) {
  const d = await getDb();
  const next = Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0));
  await d.runAsync('UPDATE variants SET stock = ? WHERE product_id = ? AND size = ? AND color = ?', [next, Number(productId), size, color]);
  return await syncAggregateStock(d, productId);
}
async function adjustVariantStockImpl(productId, size, color, delta) {
  const d = await getDb();
  const row = await d.getFirstAsync('SELECT stock FROM variants WHERE product_id = ? AND size = ? AND color = ?', [Number(productId), size, color]);
  const current = row ? Number(row.stock) : 0;
  const next = Math.max(0, current + Math.floor(Number(delta)));
  await d.runAsync('UPDATE variants SET stock = ? WHERE product_id = ? AND size = ? AND color = ?', [next, Number(productId), size, color]);
  return await syncAggregateStock(d, productId);
}

// Checkout deduction: validates every line first, then deducts in one
// transaction so failed checkout preserves inventory. Throws on shortage.
async function deductVariantStockImpl(lines) {
  const d = await getDb();
  await d.execAsync('BEGIN;');
  try {
    for (const line of lines) {
      const row = await d.getFirstAsync('SELECT stock FROM variants WHERE product_id = ? AND size = ? AND color = ?', [Number(line.productId), line.size, line.color]);
      const have = row ? Number(row.stock) : 0;
      if (have < Number(line.qty)) {
        throw new Error(`Not enough stock for size ${line.size} (${line.color}).`);
      }
    }
    for (const line of lines) {
      await d.runAsync('UPDATE variants SET stock = stock - ? WHERE product_id = ? AND size = ? AND color = ?', [Number(line.qty), Number(line.productId), line.size, line.color]);
    }
    const touched = [...new Set(lines.map(l => Number(l.productId)))];
    for (const pid of touched) await syncAggregateStock(d, pid);
    await d.execAsync('COMMIT;');
  } catch (e) {
    try {
      await d.execAsync('ROLLBACK;');
    } catch {}
    throw e;
  }
}

// Cancellation restore: adds quantities back (used exactly once per order).
async function restoreVariantStockImpl(lines) {
  const d = await getDb();
  await d.execAsync('BEGIN;');
  try {
    for (const line of lines) {
      await d.runAsync('UPDATE variants SET stock = stock + ? WHERE product_id = ? AND size = ? AND color = ?', [Number(line.qty), Number(line.productId), line.size, line.color]);
    }
    const touched = [...new Set(lines.map(l => Number(l.productId)))];
    for (const pid of touched) await syncAggregateStock(d, pid);
    await d.execAsync('COMMIT;');
  } catch (e) {
    try {
      await d.execAsync('ROLLBACK;');
    } catch {}
    throw e;
  }
}
async function setProductAvailableImpl(id, available) {
  const d = await getDb();
  if (available) {
    const row = await d.getFirstAsync('SELECT stock FROM products WHERE id = ?', [Number(id)]);
    if (!row || Number(row.stock) <= 0) return false; // re-enabling needs stock
  }
  await d.runAsync('UPDATE products SET available = ? WHERE id = ?', [available ? 1 : 0, Number(id)]);
  return true;
}

// Roll back multi-statement writes if storage fails or the page is interrupted.
async function withWriteTransaction(operation) {
  const d = await getDb();
  await d.execAsync('BEGIN;');
  try {
    const result = await operation();
    await d.execAsync('COMMIT;');
    return result;
  } catch (error) {
    try { await d.execAsync('ROLLBACK;'); } catch {}
    throw error;
  }
}

// Serialize writes so async transactions and stock adjustments cannot overlap.
let writeQueue = Promise.resolve();
function enqueueWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}

export function initDatabase(...args) {
  return enqueueWrite(() => initDatabaseImpl(...args));
}

export function resetCatalogToSeed(...args) {
  return enqueueWrite(() => withWriteTransaction(() => resetCatalogToSeedImpl(...args)));
}

export function insertProduct(...args) {
  return enqueueWrite(() => withWriteTransaction(() => insertProductImpl(...args)));
}

export function updateProduct(...args) {
  return enqueueWrite(() => updateProductImpl(...args));
}

export function deleteProductRecord(...args) {
  return enqueueWrite(() => deleteProductRecordImpl(...args));
}

export function setVariantStock(...args) {
  return enqueueWrite(() => setVariantStockImpl(...args));
}

export function adjustVariantStock(...args) {
  return enqueueWrite(() => adjustVariantStockImpl(...args));
}

export function deductVariantStock(...args) {
  return enqueueWrite(() => deductVariantStockImpl(...args));
}

export function restoreVariantStock(...args) {
  return enqueueWrite(() => restoreVariantStockImpl(...args));
}

export function setProductAvailable(...args) {
  return enqueueWrite(() => setProductAvailableImpl(...args));
}

export function saveOrderPicture(key, dataUri) {
  return enqueueWrite(async () => {
    const d = await getDb();
    await d.runAsync('INSERT OR IGNORE INTO order_images (key, dataUri) VALUES (?, ?)', [key, dataUri]);
  });
}

export async function fetchOrderPicture(key) {
  const d = await getDb();
  const row = await d.getFirstAsync('SELECT dataUri FROM order_images WHERE key = ?', [key]);
  return row ? row.dataUri : null;
}

