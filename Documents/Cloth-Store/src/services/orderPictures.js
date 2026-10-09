import { fetchOrderPicture, saveOrderPicture } from './db';

const isUploadedPicture = (value) => typeof value === 'string' && value.startsWith('data:image/');

// Keep immutable order photos in SQLite, independent of product edits/deletion.
// AsyncStorage holds small references; display-only image sources stay in memory.
export async function prepareOrderPictures(order) {
  const items = [];
  const saved = new Set();
  for (const item of order.items) {
    const uri = isUploadedPicture(item.imageKey) ? item.imageKey
      : isUploadedPicture(item.image && item.image.uri) ? item.image.uri : null;
    if (!uri) { items.push(item); continue; }
    const key = `order-picture:${order.id}:${item.productId}`;
    if (!saved.has(key)) {
      await saveOrderPicture(key, uri);
      saved.add(key);
    }
    items.push({ ...item, imageKey: key, image: { uri } });
  }
  return { ...order, items };
}

export function serializeOrders(orders) {
  return JSON.stringify(orders.map((order) => ({
    ...order,
    items: order.items.map(({ image, ...item }) => item),
  })));
}

export async function hydrateOrderPictures(orders) {
  const restored = [];
  const pictures = new Map();
  for (const original of orders) {
    // Also compact any earlier order snapshots that embedded uploaded photos.
    // A photo-storage error must never discard saved orders or other preferences.
    const order = await prepareOrderPictures(original).catch(() => original);
    const items = [];
    for (const item of order.items) {
      if (typeof item.imageKey !== 'string' || !item.imageKey.startsWith('order-picture:')) {
        items.push(item);
        continue;
      }
      if (!pictures.has(item.imageKey)) {
        pictures.set(item.imageKey, await Promise.resolve().then(() => fetchOrderPicture(item.imageKey)).catch(() => null));
      }
      const uri = pictures.get(item.imageKey);
      items.push(uri ? { ...item, image: { uri } } : item);
    }
    restored.push({ ...order, items });
  }
  return restored;
}
