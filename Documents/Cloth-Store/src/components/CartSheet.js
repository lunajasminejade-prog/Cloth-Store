import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { ACTION_H, DEEP, FAINT_BORDER, FONT, INK, MUTED, RADIUS, SHEET_RADIUS, TILE, WHITE } from '../theme';
import SummaryRows from './SummaryRows';
import { PrimaryButton } from './buttons';

// My Cart presented as the Figma-style white bottom sheet over a dimmed screen.
// Includes quantity steppers, remove actions, totals, and the full-width Checkout button.
// Coupon controls live on Checkout so this frame keeps its layout.
export default function CartSheet() {
  const shop = useShop();
  const { cartOpen, setCartOpen, cart, cartCount, subTotal, fee, discount, total } = shop;

  return (
    <Modal visible={cartOpen} transparent animationType="slide" onRequestClose={() => setCartOpen(false)}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={() => setCartOpen(false)} accessibilityLabel="Close cart" />
        <View style={[styles.sheet, { width: Math.min(shop.width, 640), alignSelf: 'center' }]}>
          <View style={styles.handle} />
          <View style={styles.cartHead}>
            <Text style={styles.title}>My Cart</Text>
            <Text style={styles.count}>
              {cartCount} item{cartCount === 1 ? '' : 's'}
            </Text>
          </View>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySub}>Add something you love from Trending now.</Text>
              <PrimaryButton
                label="Browse products"
                onPress={() => {
                  setCartOpen(false);
                  shop.goTab('Shop');
                }}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <>
              <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 8 }}>
                {cart.map((i) => {
                  const p = shop.productById(i.productId);
                  if (!p) return null;
                  return (
                    <View key={i.key} style={styles.item}>
                      <View style={styles.thumb}>
                        <Image source={p.image || imageForKey(p.imageKey)} style={styles.thumbImg} resizeMode="contain" />
                      </View>
                      <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={styles.meta}>
                          {i.color} {"\u00B7"} Size {i.size}
                        </Text>
                        <View style={styles.row}>
                          <View style={styles.stepper}>
                            <Pressable
                              onPress={() => shop.changeQty(i.key, -1)}
                              disabled={i.qty <= 1}
                              style={styles.stepBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease quantity of ${p.name}`}
                              hitSlop={8}
                            >
                              <Text style={[styles.stepGlyph, i.qty <= 1 && styles.stepDisabled]}>{"\u2212"}</Text>
                            </Pressable>
                            <Text style={styles.stepQty}>{i.qty}</Text>
                            <Pressable
                              onPress={() => shop.changeQty(i.key, 1)}
                              style={styles.stepBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Increase quantity of ${p.name}`}
                              hitSlop={8}
                            >
                              <Text style={styles.stepGlyph}>+</Text>
                            </Pressable>
                          </View>
                          <View style={styles.pricePill}>
                            <Text style={styles.pricePillText}>{peso(p.price * i.qty)}</Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${p.name}`}
                        onPress={() => shop.removeItem(i.key)}
                        style={styles.removeBtn}
                        hitSlop={12}
                      >
                        <Text style={styles.removeX}>{"\u00D7"}</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <SummaryRows subTotal={subTotal} fee={fee} discount={discount} total={total} />
              </ScrollView>
              <PrimaryButton label="Checkout" onPress={shop.openCheckout} style={styles.checkoutBtn} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: 16, paddingBottom: 24, maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: FAINT_BORDER, alignSelf: 'center', marginTop: 8 },
  cartHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: INK, fontFamily: FONT },
  count: { fontSize: 14, color: MUTED, fontFamily: FONT },
  scroll: { maxHeight: 380, marginTop: 8 },
  item: {
    flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: FAINT_BORDER,
    borderRadius: RADIUS, padding: 8, marginBottom: 8, minHeight: 88,
  },
  thumb: { width: 56, height: 56, borderRadius: RADIUS, backgroundColor: TILE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 48, height: 48 },
  info: { flex: 1, minWidth: 0, gap: 6 },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  meta: { fontSize: 14, color: MUTED, fontFamily: FONT },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TILE,
    borderRadius: 12, paddingHorizontal: 4, height: 32,
  },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 16, color: DEEP, fontWeight: '700' },
  stepDisabled: { color: MUTED, opacity: 0.4 },
  stepQty: { fontSize: 14, fontWeight: '600', color: INK, minWidth: 18, textAlign: 'center', fontFamily: FONT },
  pricePill: { backgroundColor: DEEP, borderRadius: RADIUS, paddingHorizontal: 8, paddingVertical: 4 },
  pricePillText: { color: WHITE, fontSize: 14, fontWeight: '700', fontFamily: FONT },
  removeBtn: { width: 24, alignItems: 'center', alignSelf: 'flex-start' },
  removeX: { fontSize: 22, color: '#8C56D4' },
  checkoutBtn: { width: '100%', marginTop: 16 },
  emptyCart: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, fontFamily: FONT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 8, fontFamily: FONT },
});
