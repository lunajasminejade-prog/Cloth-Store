// Offline-first product database for Cloth Store (expo-sqlite).
// Products, aggregate stock, and size/color variant inventory live in SQLite.
// Auxiliary preferences (cart, wishlist, orders, profile, settings) stay in
// AsyncStorage under separate versioned keys (see store/ShopContext.js).
//
// Uses modern expo-sqlite sync APIs: openDatabaseSync, execSync,
// getAllSync, getFirstSync, runSync. WAL mode is enabled on supported
// native platforms; web ignores the pragma safely.
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'clothstore.db';
const SEED_FLAG = 'seeded_v1';

let db = null;
let initError = null;

export function getDb() {
  if (!db) db = SQLite.openDatabaseSync(DB_NAME);
  return db;
}

export function getInitError() {
  return initError;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
function createSchema(d) {
  d.execSync(`
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

function enableWal(d) {
  try {
    d.execSync('PRAGMA journal_mode = WAL;');
  } catch {
    // Web and some platforms do not support WAL; ignore.
  }
  try {
    d.execSync('PRAGMA foreign_keys = ON;');
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
export const SEED_PRODUCTS = [
  {
    name: "Men's Pullover Hoodie",
    category: 'Trending',
    categories: ['Trending', 'Shirts'],
    price: 1999,
    imageKey: 'hoodie-purple',
    description: 'Soft cotton fleece with a relaxed fit. Your everyday layer for effortless comfort.',
  },
  {
    name: 'Relaxed Knit Shirt',
    category: 'Trending',
    categories: ['Trending', 'Shirts'],
    price: 1499,
    imageKey: 'knit-shirt',
    description: 'Breathable knit polo with a soft hand feel. Smart enough for evenings out.',
  },
  {
    name: 'Everyday Hoodie',
    category: 'Trending',
    categories: ['Trending', 'Shirts'],
    price: 1999,
    imageKey: 'hoodie-purple',
    description: 'Brushed-back fleece hoodie with kangaroo pocket. A closet staple in lavender.',
  },
  {
    name: 'Essential Shirt',
    category: 'Trending',
    categories: ['Trending', 'Shirts'],
    price: 999,
    imageKey: 'essential-shirt',
    description: 'Lightweight everyday shirt with a clean cut. Pairs with anything you own.',
  },
  {
    name: 'Weekend Knit Polo',
    category: 'Shirts',
    categories: ['Shirts'],
    price: 1299,
    imageKey: 'knit-shirt',
    description: 'Textured knit polo with ribbed trims. Easy comfort for the weekend.',
  },
  {
    name: 'Cloud Fleece Hoodie',
    category: 'Shirts',
    categories: ['Shirts'],
    price: 2199,
    imageKey: 'hoodie-purple',
    description: 'Extra-soft fleece with a roomy hood. Warmth without the weight.',
  },
];

export const SEED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const SEED_COLORS = ['Lavender', 'Deep Plum', 'Cloud'];

// Clearly defined demo stock values (not live inventory).
// Most variants get 8 units; a deterministic subset is low (2) so the
// Inventory screen and disabled states have something real to show.
function seedVariantStock(productIdx, sizeIdx, colorIdx) {
  if (productIdx === 5 && sizeIdx === 5 && colorIdx === 2) return 0; // one sold-out demo variant
  return (productIdx + sizeIdx + colorIdx) % 5 === 0 ? 2 : 8;
}

function insertSeedProduct(d, seed, sortOrder) {
  const res = d.runSync(
    'INSERT INTO products (name, category, price, stock, description, imageKey, categories, sortOrder, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
    [
      seed.name,
      seed.category,
      seed.price,
      0,
      seed.description,
      seed.imageKey,
      JSON.stringify(seed.categories),
      sortOrder,
      new Date().toISOString(),
    ],
  );
  const productId = Number(res.lastInsertRowId);
  let total = 0;
  SEED_SIZES.forEach((size, si) => {
    SEED_COLORS.forEach((color, ci) => {
      const stock = seedVariantStock(sortOrder, si, ci);
      d.runSync('INSERT INTO variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)', [
        productId,
        size,
        color,
        stock,
      ]);
      total += stock;
    });
  });
  d.runSync('UPDATE products SET stock = ? WHERE id = ?', [total, productId]);
  return productId;
}

function seedIfNeeded(d) {
  const flag = d.getFirstSync('SELECT value FROM meta WHERE key = ?', [SEED_FLAG]);
  if (flag && flag.value) return false; // seeded before: never reseed (even if empty)
  const countRow = d.getFirstSync('SELECT COUNT(*) AS n FROM products');
  if (countRow && Number(countRow.n) > 0) {
    d.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
    return false;
  }
  SEED_PRODUCTS.forEach((seed, i) => insertSeedProduct(d, seed, i));
  d.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
  return true;
}

// Initialize the database and seed the catalog exactly once.
// An explicit confirmed demo reset (resetCatalogToSeed) is the only path
// that restores the seed catalog afterwards.
export function initDatabase() {
  const d = getDb();
  enableWal(d);
  createSchema(d);
  return seedIfNeeded(d);
}

// Explicit confirmed demo reset: wipe catalog + variants, then re-seed.
// Saved order photos are cleared too: reset also clears order history,
// so no order can reference them afterwards.
export function resetCatalogToSeed() {
  const d = getDb();
  d.execSync('DELETE FROM variants;');
  d.execSync('DELETE FROM products;');
  d.execSync('DELETE FROM order_images;');
  d.runSync('DELETE FROM meta WHERE key = ?', [SEED_FLAG]);
  SEED_PRODUCTS.forEach((seed, i) => insertSeedProduct(d, seed, i));
  d.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, '1']);
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
    createdAt: String(row.createdAt || ''),
  };
}

// ---------------------------------------------------------------------------
// Queries — search uses parameterized WHERE ... LIKE ? with bound values.
// ---------------------------------------------------------------------------
export function fetchProducts({ search = '', category = 'All', sort = 'featured', maxPrice = 'all' } = {}) {
  const d = getDb();
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
  if (sort === 'low') orderBy = 'price ASC, sortOrder ASC';
  else if (sort === 'high') orderBy = 'price DESC, sortOrder ASC';
  else if (sort === 'name') orderBy = 'name ASC';
  const sql = `SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
  return d.getAllSync(sql, params).map(mapProduct);
}

export function fetchProductById(id) {
  const d = getDb();
  return mapProduct(d.getFirstSync('SELECT * FROM products WHERE id = ?', [Number(id)]));
}

export function fetchAllProducts() {
  return fetchProducts({});
}

export function fetchVariants(productId) {
  const d = getDb();
  return d.getAllSync('SELECT size, color, stock FROM variants WHERE product_id = ? ORDER BY size, color', [
    Number(productId),
  ]);
}

export function fetchAllVariants() {
  const d = getDb();
  const rows = d.getAllSync('SELECT product_id AS productId, size, color, stock FROM variants');
  const map = {};
  for (const r of rows) {
    const pid = Number(r.productId);
    if (!map[pid]) map[pid] = [];
    map[pid].push({ size: String(r.size), color: String(r.color), stock: Number(r.stock) });
  }
  return map;
}

export function getLowStockProducts(threshold = 10) {
  const d = getDb();
  return d
    .getAllSync('SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC, sortOrder ASC', [Number(threshold)])
    .map(mapProduct);
}

// ---------------------------------------------------------------------------
// Mutations — all parameterized; stock can never go negative.
// ---------------------------------------------------------------------------
export function syncAggregateStock(d, productId) {
  const row = d.getFirstSync('SELECT COALESCE(SUM(stock), 0) AS total FROM variants WHERE product_id = ?', [
    Number(productId),
  ]);
  const total = Number(row ? row.total : 0);
  d.runSync('UPDATE products SET stock = ?, available = CASE WHEN ? > 0 AND available = 0 THEN available ELSE CASE WHEN ? > 0 THEN available ELSE 0 END END WHERE id = ?', [
    total,
    total,
    total,
    Number(productId),
  ]);
  // Auto-hide products with zero aggregate stock; re-enabling is manual.
  return total;
}

export function insertProduct({ name, category, price, stock, description = '', imageKey = 'hoodie-purple', categories = null }) {
  const d = getDb();
  const total = Math.max(0, Math.floor(Number(stock)));
  const cats = Array.isArray(categories) && categories.length ? categories : [category];
  const orderRow = d.getFirstSync('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextOrder FROM products');
  const sortOrder = Number(orderRow ? orderRow.nextOrder : 0);
  const res = d.runSync(
    'INSERT INTO products (name, category, price, stock, description, imageKey, categories, sortOrder, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      name.trim(),
      category,
      Number(price),
      0,
      String(description || ''),
      imageKey,
      JSON.stringify(cats),
      sortOrder,
      total > 0 ? 1 : 0,
      new Date().toISOString(),
    ],
  );
  const productId = Number(res.lastInsertRowId);
  // Distribute initial stock evenly across all size/color variants so the
  // aggregate stays consistent and every variant starts purchasable.
  const cells = SEED_SIZES.length * SEED_COLORS.length;
  const per = Math.floor(total / cells);
  let remainder = total - per * cells;
  SEED_SIZES.forEach((size) => {
    SEED_COLORS.forEach((color) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      d.runSync('INSERT INTO variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)', [
        productId,
        size,
        color,
        per + extra,
      ]);
    });
  });
  syncAggregateStock(d, productId);
  return productId;
}

export function updateProduct(id, { name, category, price, description, imageKey, categories, available }) {
  const d = getDb();
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
  d.runSync(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function deleteProductRecord(id) {
  const d = getDb();
  d.execSync('BEGIN;');
  try {
    d.runSync('DELETE FROM variants WHERE product_id = ?', [Number(id)]);
    d.runSync('DELETE FROM products WHERE id = ?', [Number(id)]);
    d.execSync('COMMIT;');
  } catch (e) {
    try {
      d.execSync('ROLLBACK;');
    } catch {}
    throw e;
  }
}

export function setVariantStock(productId, size, color, value) {
  const d = getDb();
  const next = Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0));
  d.runSync('UPDATE variants SET stock = ? WHERE product_id = ? AND size = ? AND color = ?', [
    next,
    Number(productId),
    size,
    color,
  ]);
  return syncAggregateStock(d, productId);
}

export function adjustVariantStock(productId, size, color, delta) {
  const d = getDb();
  const row = d.getFirstSync('SELECT stock FROM variants WHERE product_id = ? AND size = ? AND color = ?', [
    Number(productId),
    size,
    color,
  ]);
  const current = row ? Number(row.stock) : 0;
  const next = Math.max(0, current + Math.floor(Number(delta)));
  d.runSync('UPDATE variants SET stock = ? WHERE product_id = ? AND size = ? AND color = ?', [
    next,
    Number(productId),
    size,
    color,
  ]);
  return syncAggregateStock(d, productId);
}

// Checkout deduction: validates every line first, then deducts in one
// transaction so failed checkout preserves inventory. Throws on shortage.
export function deductVariantStock(lines) {
  const d = getDb();
  d.execSync('BEGIN;');
  try {
    for (const line of lines) {
      const row = d.getFirstSync(
        'SELECT stock FROM variants WHERE product_id = ? AND size = ? AND color = ?',
        [Number(line.productId), line.size, line.color],
      );
      const have = row ? Number(row.stock) : 0;
      if (have < Number(line.qty)) {
        throw new Error(`Not enough stock for size ${line.size} (${line.color}).`);
      }
    }
    for (const line of lines) {
      d.runSync('UPDATE variants SET stock = stock - ? WHERE product_id = ? AND size = ? AND color = ?', [
        Number(line.qty),
        Number(line.productId),
        line.size,
        line.color,
      ]);
    }
    const touched = [...new Set(lines.map((l) => Number(l.productId)))];
    for (const pid of touched) syncAggregateStock(d, pid);
    d.execSync('COMMIT;');
  } catch (e) {
    try {
      d.execSync('ROLLBACK;');
    } catch {}
    throw e;
  }
}

// Cancellation restore: adds quantities back (used exactly once per order).
export function restoreVariantStock(lines) {
  const d = getDb();
  d.execSync('BEGIN;');
  try {
    for (const line of lines) {
      d.runSync('UPDATE variants SET stock = stock + ? WHERE product_id = ? AND size = ? AND color = ?', [
        Number(line.qty),
        Number(line.productId),
        line.size,
        line.color,
      ]);
    }
    const touched = [...new Set(lines.map((l) => Number(l.productId)))];
    for (const pid of touched) syncAggregateStock(d, pid);
    d.execSync('COMMIT;');
  } catch (e) {
    try {
      d.execSync('ROLLBACK;');
    } catch {}
    throw e;
  }
}

export function setProductAvailable(id, available) {
  const d = getDb();
  if (available) {
    const row = d.getFirstSync('SELECT stock FROM products WHERE id = ?', [Number(id)]);
    if (!row || Number(row.stock) <= 0) return false; // re-enabling needs stock
  }
  d.runSync('UPDATE products SET available = ? WHERE id = ?', [available ? 1 : 0, Number(id)]);
  return true;
}

// Saved order pictures remain intact when products are edited or removed.
export function saveOrderPicture(key, dataUri) {
  getDb().runSync('INSERT OR IGNORE INTO order_images (key, dataUri) VALUES (?, ?)', [key, dataUri]);
}

export function fetchOrderPicture(key) {
  const row = getDb().getFirstSync('SELECT dataUri FROM order_images WHERE key = ?', [key]);
  return row ? row.dataUri : null;
}
