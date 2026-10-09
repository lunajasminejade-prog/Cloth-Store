import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COUPON_CODE, PAYMENTS, imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FONT, INK, MUTED, TILE } from '../theme';
import { EmptyState, PrimaryButton, SecondaryButton } from '../components/buttons';
import { Field, ScreenHead } from '../components/ScreenHead';
import SummaryRows from '../components/SummaryRows';

export default function CheckoutScreen() {
  const shop = useShop();
  const { cart, subTotal, fee, discount, total, coErrors, placing } = shop;

  if (!cart.length) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHead title="Checkout" onBack={shop.goBack} />
        <EmptyState
          title="Your cart is empty"
          sub="Add products before checking out."
          actionLabel="Go to Shop"
          onAction={() => shop.navTo('shop', 'Shop')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Checkout" onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Items</Text>
        {cart.map((i) => {
          const p = shop.productById(i.productId);
          if (!p) return null;
          return (
            <View key={i.key} style={styles.row}>
              <Image source={p.image || imageForKey(p.imageKey)} style={styles.thumb} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta}>
                  {i.color} {"\u00B7"} Size {i.size} {"\u00B7"} Qty {i.qty}
                </Text>
              </View>
              <Text style={styles.line}>{peso(p.price * i.qty)}</Text>
            </View>
          );
        })}
        <SummaryRows subTotal={subTotal} fee={fee} discount={discount} total={total} />

        <Text style={styles.sectionLabel}>Coupon (demo)</Text>
        {shop.couponApplied ? (
          <View style={styles.couponOn}>
            <Text style={styles.couponOnText}>{COUPON_CODE} applied — 20% off merchandise.</Text>
            <Pressable onPress={shop.clearCoupon} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove coupon">
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Field
              label={`Code (try ${COUPON_CODE})`}
              value={shop.coCoupon}
              onChange={shop.setCoCoupon}
              placeholder="Enter coupon code"
              error={coErrors.coupon}
            />
            <SecondaryButton label="Apply coupon" onPress={shop.applyCoupon} style={{ marginTop: 8 }} />
          </View>
        )}

        <Text style={styles.sectionLabel}>Delivery details</Text>
        <Field label="Full name" value={shop.coName} onChange={shop.setCoName} placeholder="e.g. Alex Santos" error={coErrors.name} />
        <Field
          label="Phone number"
          value={shop.coPhone}
          onChange={shop.setCoPhone}
          placeholder="e.g. 09171234567"
          error={coErrors.phone}
          keyboardType="phone-pad"
        />
        <Field label="Address" value={shop.coAddress} onChange={shop.setCoAddress} placeholder="Street, barangay, city" error={coErrors.address} />

        <Text style={styles.sectionLabel}>Payment (demo only)</Text>
        {PAYMENTS.map((p) => (
          <Pressable
            key={p}
            onPress={() => shop.setCoPay(p)}
            style={[styles.payRow, shop.coPay === p && styles.payRowOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: shop.coPay === p }}
          >
            <View style={[styles.radio, shop.coPay === p && styles.radioOn]} />
            <Text style={styles.payLabel}>{p}</Text>
          </Pressable>
        ))}
        <Text style={styles.demoNote}>Local demo checkout. No real payment is processed and no card details are collected.</Text>
      </ScrollView>
      <View style={styles.actionsBar}>
        <PrimaryButton
          label={placing ? 'Placing order\u2026' : `Place order \u00B7 ${peso(total)}`}
          onPress={shop.submitOrder}
          disabled={placing}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EAF7',
  },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: TILE },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  meta: { fontSize: 14, color: MUTED, fontFamily: FONT },
  line: { fontSize: 14, fontWeight: '700', color: INK, fontFamily: FONT },
  couponOn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: DEEP, backgroundColor: TILE, marginTop: 8,
  },
  couponOnText: { fontSize: 14, color: INK, fontFamily: FONT, flex: 1, minWidth: 0 },
  remove: { fontSize: 14, fontWeight: '600', color: DEEP, fontFamily: FONT },
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(140,86,212,0.15)', marginTop: 8,
  },
  payRowOn: { borderColor: DEEP, backgroundColor: TILE },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#8C56D4' },
  radioOn: { borderColor: DEEP, backgroundColor: DEEP },
  payLabel: { fontSize: 14, color: INK, fontFamily: FONT },
  demoNote: { fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 18, fontFamily: FONT },
  actionsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EAF7',
  },
});
