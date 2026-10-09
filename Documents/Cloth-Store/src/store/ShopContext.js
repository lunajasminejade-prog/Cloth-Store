// Shared app state for Cloth Store.
// Products + variant inventory live in SQLite (services/db.js) and are read
// with parameterized SELECT queries. Cart, wishlist, orders, profile, and
// preferences persist in AsyncStorage under versioned clothstore:* keys
// (separate from Shoe Store). Toasts, dialogs, and loading flags are never
// persisted. Saved data is restored before defaults are used, and malformed
// storage is handled safely.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORS,
  COUPON_CODE,
  COUPON_RATE,
  DEFAULT_DELIVERY_FEE,
  uniqueOrderId,
} from '../data/products';
import { CONTENT_MAX_W, GRID_GAP, SIDE_PAD } from '../theme';
import {
  adjustVariantStock as dbAdjustVariant,
  deductVariantStock,
  deleteProductRecord,
  fetchAllProducts,
  fetchAllVariants,
  fetchProducts,
  getInitError,
  initDatabase,
  insertProduct as dbInsertProduct,
  resetCatalogToSeed as dbResetCatalog,
  restoreVariantStock,
  setProductAvailable as dbSetAvailable,
  setVariantStock as dbSetVariantStock,
  updateProduct as dbUpdateProduct,
} from '../services/db';
import { hydrateOrderPictures, prepareOrderPictures, serializeOrders } from '../services/orderPictures';

const K = {
  cart: 'clothstore:cart:v1',
  favorites: 'clothstore:favorites:v1',
  orders: 'clothstore:orders:v1',
  profile: 'clothstore:profile:v1',
  prefs: 'clothstore:prefs:v1',
  pic: 'clothstore:profilePic:v1',
};

// Stored profile pictures are small JPEG data URIs (square-cropped at pick
// time), so they persist offline in AsyncStorage on native and in the
// browser's persistent local storage on web — no temp URLs, no network.
export function isValidPictureUri(v) {
  return typeof v === 'string' && v.startsWith('data:image/') && v.includes(';base64,');
}

const ShopContext = createContext(null);

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

function sanitizeCart(raw, fallback = []) {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter(
      (i) =>
        i &&
        Number.isFinite(Number(i.productId)) &&
        typeof i.size === 'string' &&
        typeof i.color === 'string' &&
        Number.isFinite(Number(i.qty)),
    )
    .map((i) => ({
      key: `${Number(i.productId)}|${i.size}|${i.color}`,
      productId: Number(i.productId),
      size: i.size,
      color: i.color,
      qty: Math.min(99, Math.max(1, Math.floor(Number(i.qty)))),
    }));
}

function sanitizeFavorites(raw) {
  const out = {};
  const arr = Array.isArray(raw) ? raw : typeof raw === 'object' && raw !== null ? Object.keys(raw).filter((k) => raw[k]) : [];
  for (const id of arr) {
    const n = Number(id);
    if (Number.isFinite(n)) out[n] = true;
  }
  return out;
}

function sanitizeOrders(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((o) => o && typeof o.id === 'string' && Array.isArray(o.items));
}

export function ShopProvider({ children }) {
  const { width } = useWindowDimensions();
  const [route, setRoute] = useState('home'); // home|shop|details|wishlist|checkout|confirmation|orders|orderDetails|profile|settings|products|productForm|inventory|reports
  const [activeTab, setActiveTab] = useState('Home'); // Home|Shop|Cart|Profile
  const histRef = useRef([]);

  // Catalog (SQLite-backed)
  const [ready, setReady] = useState(false); // prefs/cart/orders restored
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [variantsMap, setVariantsMap] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);
  const catalogRequest = useRef(0);
  const orderStatusUpdates = useRef(new Set());

  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState('Trending');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [favOnly, setFavOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('all');

  const [favorites, setFavorites] = useState({});
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [orders, setOrders] = useState([]);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [orderDetailId, setOrderDetailId] = useState(null);
  const [manageOrders, setManageOrders] = useState(false); // store-tools workflow

  // Profile (local only, no login)
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileError, setProfileError] = useState({});
  const [profilePicUri, setProfilePicUri] = useState(null); // data URI or null = default avatar
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);

  // Checkout form
  const [coName, setCoName] = useState('');
  const [coPhone, setCoPhone] = useState('');
  const [coAddress, setCoAddress] = useState('');
  const [coPay, setCoPay] = useState('Cash on Delivery');
  const [coCoupon, setCoCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [coErrors, setCoErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);

  // Product form (add/edit modal)
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Shared confirm dialog {title, message, confirmLabel, onConfirm}
  const [confirm, setConfirm] = useState(null);

  const hydrated = useRef(false);

  function flash(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  // ---- initial load: SQLite first, then prefs (restore before defaults) ----
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const err = getInitError();
        if (err) setDbError(String(err));
        else setDbReady(true);
      } catch (e) {
        setDbError(e && e.message ? e.message : 'Could not open the product database.');
      }
      try {
        const [cRaw, fRaw, oRaw, pRaw, sRaw, picRaw] = await Promise.all([
          AsyncStorage.getItem(K.cart),
          AsyncStorage.getItem(K.favorites),
          AsyncStorage.getItem(K.orders),
          AsyncStorage.getItem(K.profile),
          AsyncStorage.getItem(K.prefs),
          AsyncStorage.getItem(K.pic),
        ]);
        setCart(sanitizeCart(safeParse(cRaw, [])));
        setFavorites(sanitizeFavorites(safeParse(fRaw, [])));
        setOrders(await hydrateOrderPictures(sanitizeOrders(safeParse(oRaw, []))));
        const profile = safeParse(pRaw, null) || {};
        if (typeof profile.name === 'string') setProfileName(profile.name);
        if (typeof profile.phone === 'string') setProfilePhone(profile.phone);
        if (typeof profile.address === 'string') setProfileAddress(profile.address);
        const prefs = safeParse(sRaw, null) || {};
        if (Number.isFinite(Number(prefs.deliveryFee)) && Number(prefs.deliveryFee) >= 0) {
          setDeliveryFee(Number(prefs.deliveryFee));
        }
        const pic = safeParse(picRaw, null);
        if (isValidPictureUri(pic)) setProfilePicUri(pic);
        if (typeof prefs.notifyOrders === 'boolean') setNotifyOrders(prefs.notifyOrders);
        if (typeof prefs.notifyPromos === 'boolean') setNotifyPromos(prefs.notifyPromos);
      } catch {
        // Malformed storage: fall back to empty defaults safely.
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  // ---- catalog refresh from SQL ----
  const refreshCatalog = useCallback(async () => {
    if (!dbReady) return;
    const request = ++catalogRequest.current;
    try {
      const all = await fetchAllProducts();
      const list = await fetchProducts({ search: query, category, sort, maxPrice });
      const variants = await fetchAllVariants();
      if (request !== catalogRequest.current) return;
      let out = list;
      if (favOnly) out = out.filter((p) => favorites[p.id]);
      setAllProducts(all);
      setFiltered(out);
      setVariantsMap(variants);
      setDbError(null);
      setSelectedId((prev) => {
        if (prev != null && all.some((p) => p.id === prev)) return prev;
        return all.length ? all[0].id : null;
      });
    } catch (e) {
      if (request !== catalogRequest.current) return;
      setDbError(e && e.message ? e.message : 'Could not load products.');
    }
  }, [dbReady, query, category, sort, maxPrice, favOnly, favorites, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    refreshCatalog();
    return () => { catalogRequest.current += 1; };
  }, [ready, refreshCatalog]);

  function touchCatalog() {
    setRefreshTick((t) => t + 1);
  }

  // ---- persistence (only after hydration; never toasts/dialogs/loading) ----
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(K.cart, JSON.stringify(cart)).catch(() => {});
  }, [cart]);
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(K.favorites, JSON.stringify(Object.keys(favorites).map(Number))).catch(() => {});
  }, [favorites]);
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(K.orders, serializeOrders(orders)).catch(() => {});
  }, [orders]);
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(
      K.profile,
      JSON.stringify({ name: profileName, phone: profilePhone, address: profileAddress }),
    ).catch(() => {});
  }, [profileName, profilePhone, profileAddress]);
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(
      K.prefs,
      JSON.stringify({ deliveryFee, notifyOrders, notifyPromos }),
    ).catch(() => {});
  }, [deliveryFee, notifyOrders, notifyPromos]);
  useEffect(() => {
    if (!hydrated.current) return;
    if (profilePicUri) AsyncStorage.setItem(K.pic, JSON.stringify(profilePicUri)).catch(() => {});
    else AsyncStorage.removeItem(K.pic).catch(() => {});
  }, [profilePicUri]);

  // ---- navigation ----
  function navTo(r, tab) {
    histRef.current.push({ route, tab: activeTab });
    if (histRef.current.length > 20) histRef.current.shift();
    setRoute(r);
    if (tab !== undefined) setActiveTab(tab);
  }

  function goBack() {
    const p = histRef.current.pop();
    if (p) {
      setRoute(p.route);
      setActiveTab(p.tab);
    } else {
      setRoute('home');
      setActiveTab('Home');
    }
  }

  function goTab(tab) {
    setActiveTab(tab);
    histRef.current = [];
    if (tab === 'Home') setRoute('home');
    if (tab === 'Shop') setRoute('shop');
    if (tab === 'Cart') setCartOpen(true);
    if (tab === 'Profile') setRoute('profile');
  }

  function goHome() {
    histRef.current = [];
    setRoute('home');
    setActiveTab('Home');
  }

  // ---- lookups ----
  const productById = useCallback((id) => allProducts.find((p) => p.id === Number(id)), [allProducts]);
  const product = productById(selectedId) || allProducts[0] || null;
  const lastOrder = orders.find((o) => o.id === lastOrderId) || null;
  const detailOrder = orders.find((o) => o.id === orderDetailId) || null;
  const favProducts = useMemo(
    () => allProducts.filter((p) => favorites[p.id]),
    [allProducts, favorites],
  );
  const favCount = favProducts.length;

  function variantStock(productId, size, color) {
    const list = variantsMap[Number(productId)] || [];
    const v = list.find((x) => x.size === size && x.color === color);
    return v ? v.stock : 0;
  }

  function totalStockOf(p) {
    if (!p) return 0;
    return Number(p.stock || 0);
  }

  function isPurchasable(p) {
    return !!p && p.available !== false && totalStockOf(p) > 0;
  }

  function sizeColorAvailable(p, size, color) {
    return !!p && p.available !== false && variantStock(p.id, size, color) > 0;
  }

  // ---- responsive grid ----
  const maxW = Math.min(width || 390, CONTENT_MAX_W);
  const avail = Math.max(maxW - SIDE_PAD * 2, 280);
  const gap = GRID_GAP;
  const cols = avail < 480 ? 2 : avail < 760 ? 3 : 4;
  const cardW = (avail - gap * (cols - 1)) / cols;

  // ---- cart + totals (coupon: 20% off merchandise subtotal only) ----
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const subTotal = cart.reduce((s, i) => {
    const p = productById(i.productId);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const discount = couponApplied && subTotal > 0 ? Math.round(subTotal * COUPON_RATE) : 0;
  const fee = cart.length ? deliveryFee : 0;
  const total = cart.length ? subTotal + fee - discount : 0;

  function toggleFav(id) {
    const n = Number(id);
    setFavorites((f) => {
      const next = { ...f };
      if (next[n]) delete next[n];
      else next[n] = true;
      flash(next[n] ? 'Saved to wishlist.' : 'Removed from wishlist.');
      return next;
    });
  }

  function openDetails(id) {
    setSelectedId(Number(id));
    navTo('details', 'Shop');
  }

  function openCartSheet() {
    setCartOpen(true);
    setActiveTab('Cart');
  }

  function cartQtyFor(productId, size, color) {
    const line = cart.find((i) => i.productId === Number(productId) && i.size === size && i.color === color);
    return line ? line.qty : 0;
  }

  function addToCart(sel, buyNow) {
    const p = productById(sel.productId);
    if (!p) {
      flash('That product is no longer available.');
      return;
    }
    if (!isPurchasable(p)) {
      flash('This product is out of stock (demo inventory).');
      return;
    }
    if (!sizeColorAvailable(p, sel.size, sel.color)) {
      flash(`Size ${sel.size} in ${sel.color} is out of stock.`);
      return;
    }
    const have = variantStock(p.id, sel.size, sel.color);
    const inCart = cartQtyFor(p.id, sel.size, sel.color);
    if (inCart + sel.qty > have) {
      flash(`Only ${have} available for this size/color (demo stock).`);
      return;
    }
    const key = `${p.id}|${sel.size}|${sel.color}`;
    setCart((c) => {
      const ex = c.find((i) => i.key === key);
      if (ex) return c.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + sel.qty, 99) } : i));
      return [...c, { key, productId: p.id, size: sel.size, color: sel.color, qty: sel.qty }];
    });
    if (buyNow) {
      setCartOpen(false);
      prefillCheckout();
      navTo('checkout', 'Cart');
      flash('Review your details to complete purchase.');
    } else {
      setCartOpen(true);
      setActiveTab('Cart');
      flash(`Added ${sel.qty} \u00D7 ${p.name} (${sel.size})`);
    }
  }

  function removeItem(key) {
    setCart((c) => c.filter((i) => i.key !== key));
    flash('Removed from cart.');
  }

  function changeQty(key, delta) {
    const line = cart.find((i) => i.key === key);
    if (!line) return;
    const cap = Math.max(1, variantStock(line.productId, line.size, line.color));
    if (delta > 0 && line.qty + 1 > cap) {
      flash(`Only ${cap} available for this size/color (demo stock).`);
      return;
    }
    setCart((c) =>
      c.map((i) => (i.key === key ? { ...i, qty: Math.min(99, Math.max(1, i.qty + delta)) } : i)),
    );
  }

  function prefillCheckout() {
    setCoErrors({});
    setCoName(profileName || '');
    setCoPhone(profilePhone || '');
    setCoAddress(profileAddress || '');
  }

  function openCheckout() {
    setCartOpen(false);
    prefillCheckout();
    navTo('checkout', 'Cart');
  }

  function validateCheckout() {
    const e = {};
    if (coName.trim().length < 2) e.name = 'Enter your full name.';
    const digits = coPhone.replace(/[\s-]/g, '');
    if (!/^(\+63|0)9\d{9}$/.test(digits)) e.phone = 'Enter a valid PH mobile (e.g. 09171234567).';
    if (coAddress.trim().length < 8) e.address = 'Enter your street and city.';
    setCoErrors(e);
    return Object.keys(e).length === 0;
  }

  function applyCoupon() {
    const code = coCoupon.trim().toUpperCase();
    if (!code) {
      setCoErrors((e) => ({ ...e, coupon: 'Enter a coupon code.' }));
      return;
    }
    if (code === COUPON_CODE) {
      setCouponApplied(true);
      setCoErrors((e) => {
        const next = { ...e };
        delete next.coupon;
        return next;
      });
      flash('Coupon applied: 20% off merchandise (demo).');
    } else {
      setCouponApplied(false);
      setCoErrors((e) => ({ ...e, coupon: 'That code is not valid for this demo.' }));
    }
  }

  function clearCoupon() {
    setCouponApplied(false);
    setCoCoupon('');
  }

  // Reliable checkout: single-flight guard, SQL transaction for stock,
  // then one coherent persist (orders + cleared cart) before success.
  async function submitOrder() {
    if (placingRef.current) return false; // prevent duplicate taps
    if (!cart.length) {
      flash('Your cart is empty.');
      return false;
    }
    if (!validateCheckout()) {
      flash('Please fix the highlighted fields.');
      return false;
    }
    // Revalidate availability including quantities already in the cart.
    for (const line of cart) {
      const p = productById(line.productId);
      if (!p) {
        flash('A product in your cart no longer exists.');
        return false;
      }
      if (!isPurchasable(p)) {
        flash(`${p.name} is out of stock (demo inventory).`);
        return false;
      }
      const have = variantStock(p.id, line.size, line.color);
      if (have < line.qty) {
        flash(`Not enough stock for ${p.name} (${line.size}/${line.color}). Only ${have} left.`);
        return false;
      }
    }
    placingRef.current = true;
    setPlacing(true);
    try {
      const items = cart.map((i) => {
        const p = productById(i.productId);
        return {
          productId: p.id,
          name: p.name,
          price: p.price,
          imageKey: p.imageKey,
          size: i.size,
          color: i.color,
          qty: i.qty,
        };
      });
      const orderSub = items.reduce((s, i) => s + i.price * i.qty, 0);
      const orderDiscount = couponApplied ? Math.round(orderSub * COUPON_RATE) : 0;
      const orderFee = deliveryFee;
      const order = await prepareOrderPictures({
        id: uniqueOrderId(),
        date: new Date().toISOString(),
        items,
        delivery: { name: coName.trim(), phone: coPhone.trim(), address: coAddress.trim() },
        payment: `${coPay} (demo — no real charge)`,
        subTotal: orderSub,
        fee: orderFee,
        discount: orderDiscount,
        coupon: couponApplied ? COUPON_CODE : null,
        total: orderSub + orderFee - orderDiscount,
        status: 'Pending',
        stockRestored: false,
      });
      // Stock deduction inside a SQL transaction; throws on shortage.
      await deductVariantStock(cart.map((l) => ({ productId: l.productId, size: l.size, color: l.color, qty: l.qty })));
      const nextOrders = [order, ...orders];
      try {
        await AsyncStorage.multiSet([
          [K.orders, serializeOrders(nextOrders)],
          [K.cart, JSON.stringify([])],
        ]);
      } catch {
        // Persist failed: roll inventory back and keep the cart intact.
        try {
          await restoreVariantStock(cart.map((l) => ({ productId: l.productId, size: l.size, color: l.color, qty: l.qty })));
        } catch {}
        flash('Could not save your order. Cart and inventory unchanged — try again.');
        return false;
      }
      setOrders(nextOrders);
      setCart([]);
      setLastOrderId(order.id);
      setCouponApplied(false);
      setCoCoupon('');
      touchCatalog();
      histRef.current = [];
      setRoute('confirmation');
      setActiveTab('Cart');
      return true;
    } catch (e) {
      flash(e && e.message ? e.message : 'Checkout failed. Cart unchanged.');
      return false;
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  }

  // Store-tools status editing. Cancelling restores stock exactly once.
  async function updateOrderStatus(id, status) {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status === 'Cancelled' || orderStatusUpdates.current.has(id)) return;
    orderStatusUpdates.current.add(id);
    try {
      const restoring = status === 'Cancelled' && !order.stockRestored;
      if (restoring) {
        await restoreVariantStock(
          order.items.map((i) => ({ productId: i.productId, size: i.size, color: i.color, qty: i.qty })),
        );
        touchCatalog();
      }
      setOrders((list) => list.map((o) => o.id === id
        ? { ...o, status, stockRestored: o.stockRestored || restoring }
        : o));
      flash(`Order ${id} marked ${status} (demo status).`);
    } catch {
      flash('Could not restore stock for this order.');
    } finally {
      orderStatusUpdates.current.delete(id);
    }
  }

  function openOrder(id, manage = false) {
    setOrderDetailId(id);
    setManageOrders(manage);
    navTo('orderDetails', 'Profile');
  }

  // ---- profile picture (persistent data URI; default avatar when null) ----
  const { AVATAR } = require('../data/products');
  const avatarSource = profilePicUri ? { uri: profilePicUri } : AVATAR;

  // Writes first, updates state only after the write succeeds.
  async function saveProfilePicture(dataUri) {
    if (!isValidPictureUri(dataUri)) return false;
    try {
      await AsyncStorage.setItem(K.pic, JSON.stringify(dataUri));
      setProfilePicUri(dataUri);
      return true;
    } catch {
      return false;
    }
  }

  async function removeProfilePicture() {
    try {
      await AsyncStorage.removeItem(K.pic);
    } catch {
      return false;
    }
    setProfilePicUri(null);
    return true;
  }

  // ---- profile ----
  function saveProfile() {
    const e = {};
    if (profileName.trim().length < 2) e.name = 'Enter your name.';
    if (profilePhone.trim()) {
      const digits = profilePhone.replace(/[\s-]/g, '');
      if (!/^(\+63|0)9\d{9}$/.test(digits)) e.phone = 'Enter a valid PH mobile (e.g. 09171234567).';
    }
    if (profileAddress.trim() && profileAddress.trim().length < 8) e.address = 'Enter a longer address.';
    setProfileError(e);
    if (Object.keys(e).length > 0) {
      flash('Please fix the highlighted fields.');
      return false;
    }
    // Persist, then confirm success only after the write succeeds.
    AsyncStorage.setItem(
      K.profile,
      JSON.stringify({ name: profileName.trim(), phone: profilePhone.trim(), address: profileAddress.trim() }),
    ).then(() => {
      setProfileName(profileName.trim());
      setProfilePhone(profilePhone.trim());
      setProfileAddress(profileAddress.trim());
      flash('Profile saved on this device.');
    }).catch(() => {
      flash('Could not save profile. Try again.');
    });
    return true;
  }

  // ---- product management (SQLite-backed) ----
  async function addProduct({ name, category, price, stock, description, imageKey }) {
    const id = await dbInsertProduct({ name, category, price, stock, description, imageKey });
    touchCatalog();
    flash(`Added ${name.trim()} (demo catalog).`);
    return id;
  }

  async function editProduct(id, fields) {
    await dbUpdateProduct(Number(id), fields);
    touchCatalog();
    flash('Product updated (demo catalog).');
  }

  function deleteProduct(id) {
    const p = productById(Number(id));
    setConfirm({
      title: 'Delete product?',
      message: p ? `"${p.name}" will be removed from the catalog, cart, and wishlist. Past orders keep their saved details.` : 'Remove this product?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteProductRecord(Number(id));
        } catch (e) {
          flash(e && e.message ? e.message : 'Could not delete the product.');
          return;
        }
        setCart((c) => c.filter((i) => i.productId !== Number(id)));
        setFavorites((f) => {
          const next = { ...f };
          delete next[Number(id)];
          return next;
        });
        setConfirm(null);
        touchCatalog();
        flash('Product deleted (demo catalog).');
      },
    });
  }

  async function adjustStock(productId, size, color, delta) {
    try {
      await dbAdjustVariant(Number(productId), size, color, delta);
      touchCatalog();
    } catch { flash('Could not update stock.'); }
  }

  async function setStock(productId, size, color, value) {
    try {
      await dbSetVariantStock(Number(productId), size, color, value);
      touchCatalog();
    } catch { flash('Could not update stock.'); }
  }

  async function setAvailable(productId, available) {
    try {
      const ok = await dbSetAvailable(Number(productId), available);
      if (!ok && available) flash('Add stock before re-enabling this product.');
      touchCatalog();
    } catch { flash('Could not update availability.'); }
  }

  function openProductForm(id = null) {
    setEditingProductId(id != null ? Number(id) : null);
    setProductFormOpen(true);
  }

  // ---- reset demo (confirmed; preserves profile + preferences) ----
  function requestResetDemo() {
    setConfirm({
      title: 'Reset demo data?',
      message: 'This restores the demo catalog and inventory and clears cart, wishlist, and orders. Your saved profile and preferences are kept.',
      confirmLabel: 'Reset',
      onConfirm: async () => {
        try {
          await dbResetCatalog();
        } catch {
          flash('Could not reset the catalog.');
          setConfirm(null);
          return;
        }
        const empty = { cart: [], favs: [], orders: [] };
        try {
          await AsyncStorage.multiSet([
            [K.cart, JSON.stringify(empty.cart)],
            [K.favorites, JSON.stringify(empty.favs)],
            [K.orders, JSON.stringify(empty.orders)],
          ]);
        } catch {
          flash('Catalog reset, but saved lists could not be cleared. Restart the app.');
          setConfirm(null);
          touchCatalog();
          return;
        }
        setCart([]);
        setFavorites({});
        setOrders([]);
        setLastOrderId(null);
        setCouponApplied(false);
        setCoCoupon('');
        setCategory('Trending');
        setQuery('');
        setSort('featured');
        setFavOnly(false);
        setMaxPrice('all');
        setConfirm(null);
        touchCatalog();
        flash('Demo data reset. Catalog restored.');
      },
    });
  }

  function resetFilters() {
    setCategory('Trending');
    setQuery('');
    setSort('featured');
    setFavOnly(false);
    setMaxPrice('all');
  }

  // ---- reports (saved demo orders; cancelled excluded from sales) ----
  const reports = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'Cancelled');
    const completed = orders.filter((o) => o.status === 'Delivered');
    const sales = completed.reduce((s, o) => s + Number(o.total || 0), 0);
    const byStatus = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const avg = completed.length ? Math.round(sales / completed.length) : 0;
    const sellerMap = {};
    for (const o of valid) {
      for (const i of o.items) {
        const k = i.productId;
        if (!sellerMap[k]) sellerMap[k] = { productId: k, name: i.name, qty: 0, revenue: 0 };
        sellerMap[k].qty += Number(i.qty || 0);
        sellerMap[k].revenue += Number(i.price || 0) * Number(i.qty || 0);
      }
    }
    const bestSellers = Object.values(sellerMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const trendMap = {};
    for (const o of completed) {
      const d = new Date(o.date);
      const key = Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      if (!trendMap[key]) trendMap[key] = { day: key, orders: 0, sales: 0 };
      trendMap[key].orders += 1;
      trendMap[key].sales += Number(o.total || 0);
    }
    return {
      sales,
      orderCount: valid.length,
      completedCount: completed.length,
      avgCompleted: avg,
      byStatus,
      bestSellers,
      trend: Object.values(trendMap),
      basis: 'Sales = Delivered orders only (merchandise + delivery fee \u2212 discounts). Cancelled orders are excluded.',
    };
  }, [orders]);

  const greetingName = profileName && profileName.trim() ? profileName.trim() : 'Alex';

  const value = {
    ready,
    dbReady,
    dbError,
    width,
    maxW,
    avail,
    gap,
    cols,
    cardW,
    route,
    activeTab,
    navTo,
    goBack,
    goTab,
    goHome,
    products: filtered,
    allProducts,
    product,
    selectedId,
    openDetails,
    productById,
    variantsMap,
    variantStock,
    totalStockOf,
    isPurchasable,
    sizeColorAvailable,
    category,
    setCategory,
    query,
    setQuery,
    sort,
    setSort,
    favOnly,
    setFavOnly,
    maxPrice,
    setMaxPrice,
    filtered,
    resetFilters,
    favorites,
    toggleFav,
    favProducts,
    favCount,
    cart,
    cartCount,
    subTotal,
    discount,
    fee,
    total,
    deliveryFee,
    setDeliveryFee,
    couponApplied,
    coCoupon,
    setCoCoupon,
    applyCoupon,
    clearCoupon,
    addToCart,
    removeItem,
    changeQty,
    cartQtyFor,
    cartOpen,
    setCartOpen,
    openCartSheet,
    openCheckout,
    filterOpen,
    setFilterOpen,
    toast,
    flash,
    orders,
    lastOrderId,
    lastOrder,
    detailOrder,
    openOrder,
    manageOrders,
    setManageOrders,
    updateOrderStatus,
    submitOrder,
    placing,
    validateCheckout,
    coName,
    setCoName,
    coPhone,
    setCoPhone,
    coAddress,
    setCoAddress,
    coPay,
    setCoPay,
    coErrors,
    profileName,
    setProfileName,
    profilePhone,
    setProfilePhone,
    profileAddress,
    setProfileAddress,
    profileError,
    saveProfile,
    profilePicUri,
    avatarSource,
    saveProfilePicture,
    removeProfilePicture,
    greetingName,
    notifyOrders,
    setNotifyOrders,
    notifyPromos,
    setNotifyPromos,
    resetDemo: requestResetDemo,
    addProduct,
    editProduct,
    deleteProduct,
    adjustStock,
    setStock,
    setAvailable,
    productFormOpen,
    setProductFormOpen,
    editingProductId,
    openProductForm,
    confirm,
    setConfirm,
    reports,
    refreshCatalog,
    colorOptions: COLORS,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
