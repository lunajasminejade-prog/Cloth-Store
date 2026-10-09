// Cloth Store catalog constants, formatting helpers, and bundled image keys.
// The live catalog lives in SQLite (see services/db.js); nothing here is a
// live product list. Seed input lives in services/db.js (SEED_PRODUCTS).
export const DEFAULT_DELIVERY_FEE = 150;
export const DELIVERY_FEE = 150; // legacy alias (default fee for new checkouts)
export const COUPON_CODE = 'DISCOUNT20';
export const COUPON_RATE = 0.2;
export const LOW_STOCK_THRESHOLD = 10;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const COLORS = [
  { name: 'Lavender', hex: '#8C56D4' },
  { name: 'Deep Plum', hex: '#722F99' },
  { name: 'Cloud', hex: '#FFFFFF' },
];

export const CATEGORIES = ['Trending', 'Shoes', 'Bag', 'Shirts'];

export const PAYMENTS = ['Cash on Delivery', 'GCash (demo)', 'Card (demo)'];

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export const PRICE_CAPS = [
  ['all', 'All prices'],
  ['1500', 'Under \u20B11,500'],
  ['2000', 'Under \u20B12,000'],
];

export const SORTS = [
  ['featured', 'Featured'],
  ['low', 'Price: low to high'],
  ['high', 'Price: high to low'],
  ['name', 'Name A\u2013Z'],
];

// SQLite stores a bundled asset key or an uploaded image data URI. Resolving
// both here keeps catalog, inventory, cart and saved order pictures consistent.
export const PRODUCT_IMAGES = {
  'hoodie-purple': require('../../assets/products/hoodie-purple.png'),
  'knit-shirt': require('../../assets/products/knit-shirt.png'),
  'essential-shirt': require('../../assets/products/essential-shirt.png'),
};

export const IMAGE_KEYS = Object.keys(PRODUCT_IMAGES);

export function imageForKey(key) {
  if (typeof key === 'string' && /^data:image\/[\w.+-]+;base64,/.test(key)) {
    return { uri: key };
  }
  return PRODUCT_IMAGES[key] || PRODUCT_IMAGES['hoodie-purple'];
}

export const AVATAR = require('../../assets/products/avatar.png');

export function peso(n) {
  return `\u20B1${Number(n).toLocaleString('en-PH')}`;
}

export function fmtDate(ts) {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function uniqueOrderId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CS-${Date.now().toString(36).toUpperCase()}${rand}`;
}
