import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { EmptyState, PrimaryButton, SecondaryButton } from '../components/buttons';
import SummaryRows from '../components/SummaryRows';

export default function OrderConfirmationScreen() {
  const shop = useShop();
  const order = shop.lastOrder;

  if (!order) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title="No order to show" actionLabel="Continue shopping" onAction={shop.goHome} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Order confirmed</Text>
        <Text style={styles.sub}>Thank you! Your order is in and being prepared.</Text>
        <View style={styles.tick}>
          <Text style={styles.tickText}>{"\u2713"}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.kv}>
            <Text style={styles.k}>Order</Text>
            <Text style={styles.v}>{order.id}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.k}>Payment</Text>
            <Text style={styles.v}>{order.payment}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.k}>Deliver to</Text>
            <Text style={[styles.v, styles.right]}>
              {order.delivery.name}
              {'\n'}
              {order.delivery.address}
            </Text>
          </View>
          <View style={styles.divider} />
          {order.items.map((i, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Image source={i.image || imageForKey(i.imageKey)} style={styles.thumb} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={styles.meta}>
                  {i.color} {"\u00B7"} Size {i.size} {"\u00B7"} Qty {i.qty}
                </Text>
              </View>
              <Text style={styles.line}>{peso(i.price * i.qty)}</Text>
            </View>
          ))}
          <SummaryRows subTotal={order.subTotal} fee={order.fee} discount={order.discount || 0} total={order.total} />
        </View>
        <View style={styles.btns}>
          <SecondaryButton label="View order" onPress={() => shop.openOrder(order.id, false)} style={{ flex: 1 }} />
          <PrimaryButton label="My orders" onPress={() => shop.navTo('orders', 'Profile')} style={{ flex: 1 }} />
        </View>
        <Pressable2 label="Continue shopping" onPress={shop.goHome} />
      </ScrollView>
    </View>
  );
}

function Pressable2({ label, onPress }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <Text onPress={onPress} style={styles.quiet} accessibilityRole="button" accessibilityLabel={label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: INK, fontFamily: FONT },
  sub: { fontSize: 14, color: MUTED, marginTop: 8, lineHeight: 20, fontFamily: FONT },
  tick: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: TILE,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 20,
  },
  tickText: { fontSize: 32, color: DEEP, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: FAINT_BORDER, borderRadius: 16, padding: 12, gap: 8, backgroundColor: WHITE },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  k: { fontSize: 16, color: MUTED, fontFamily: FONT },
  v: { fontSize: 16, fontWeight: '600', color: INK, fontFamily: FONT },
  right: { textAlign: 'right', flex: 1, minWidth: 0 },
  divider: { height: 1, backgroundColor: FAINT_BORDER },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EAF7',
  },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: TILE },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  meta: { fontSize: 14, color: MUTED, fontFamily: FONT },
  line: { fontSize: 14, fontWeight: '700', color: INK, fontFamily: FONT },
  btns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quiet: { color: DEEP, fontSize: 14, fontWeight: '600', fontFamily: FONT, padding: 12 },
});
