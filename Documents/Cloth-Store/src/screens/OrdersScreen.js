import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ORDER_STATUSES, fmtDate, imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { EmptyState } from '../components/buttons';
import { ScreenHead } from '../components/ScreenHead';
import SummaryRows from '../components/SummaryRows';

export function StatusPill({ status }) {
  return <Text style={styles.pill}>{status} (demo)</Text>;
}

export default function OrdersScreen() {
  const shop = useShop();
  const managing = shop.manageOrders;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title={managing ? 'Orders (store tools)' : 'My Orders'} onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {managing ? (
          <Text style={styles.demoNote}>Local demo statuses. Changes here never contact a carrier.</Text>
        ) : null}
        {shop.orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            sub="Your placed orders will appear here."
            actionLabel="Start shopping"
            onAction={() => shop.navTo('shop', 'Shop')}
          />
        ) : (
          shop.orders.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => shop.openOrder(o.id, managing)}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Open order ${o.id}`}
            >
              <View style={styles.kv}>
                <Text style={styles.name}>{o.id}</Text>
                <StatusPill status={o.status} />
              </View>
              <View style={styles.kv}>
                <Text style={styles.meta}>
                  {fmtDate(o.date)} {"\u00B7"} {o.items.reduce((s, i) => s + i.qty, 0)} items
                </Text>
                <Text style={styles.total}>{peso(o.total)}</Text>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

export function OrderDetailsScreen() {
  const shop = useShop();
  const order = shop.detailOrder;
  const managing = shop.manageOrders;

  if (!order) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHead title="Order" onBack={shop.goBack} />
        <EmptyState title="Order not found" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title={order.id} onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.kv}>
            <Text style={styles.meta}>Date</Text>
            <Text style={styles.value}>{fmtDate(order.date)}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.meta}>Status</Text>
            <StatusPill status={order.status} />
          </View>
          <View style={styles.kv}>
            <Text style={styles.meta}>Payment</Text>
            <Text style={styles.value}>{order.payment}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.meta}>Deliver to</Text>
            <Text style={[styles.value, styles.right]}>
              {order.delivery.name} {"\u00B7"} {order.delivery.phone}
              {'\n'}
              {order.delivery.address}
            </Text>
          </View>
        </View>
        {managing ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Update status (store demo)</Text>
            <View style={styles.statusWrap}>
              {ORDER_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    if (s === 'Cancelled' && order.status !== 'Cancelled') {
                      shop.setConfirm({
                        title: 'Cancel this order?',
                        message: `Order ${order.id} will be marked Cancelled and its demo stock restored once.`,
                        confirmLabel: 'Cancel order',
                        onConfirm: () => {
                          shop.setConfirm(null);
                          shop.updateOrderStatus(order.id, 'Cancelled');
                        },
                      });
                    } else {
                      shop.updateOrderStatus(order.id, s);
                    }
                  }}
                  style={[styles.statusChip, order.status === s && styles.statusChipOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: order.status === s }}
                  accessibilityLabel={`Set status ${s}`}
                >
                  <Text style={order.status === s ? styles.statusTextOn : styles.statusText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            {order.status === 'Cancelled' ? (
              <Text style={styles.demoNote}>Cancelled orders keep their saved totals and are excluded from sales reports.</Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.sectionLabel}>Items</Text>
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
        <Text style={styles.demoNote}>Statuses are simulated for this demo. No carrier tracking.</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: FAINT_BORDER, borderRadius: 16, padding: 12, marginTop: 12, gap: 8, backgroundColor: WHITE },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  value: { fontSize: 16, fontWeight: '600', color: INK, fontFamily: FONT },
  right: { textAlign: 'right', flex: 1, minWidth: 0 },
  meta: { fontSize: 14, color: MUTED, fontFamily: FONT },
  total: { fontSize: 18, fontWeight: '700', color: DEEP, fontFamily: FONT },
  pill: {
    fontSize: 12, fontWeight: '600', color: DEEP, backgroundColor: TILE,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', fontFamily: FONT,
  },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusChip: { paddingHorizontal: 14, height: 40, borderRadius: 16, borderWidth: 1, borderColor: '#8C56D4', alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  statusChipOn: { backgroundColor: DEEP, borderColor: DEEP },
  statusText: { fontSize: 14, color: INK, fontFamily: FONT },
  statusTextOn: { fontSize: 14, color: WHITE, fontWeight: '600', fontFamily: FONT },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EAF7',
  },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: TILE },
  line: { fontSize: 14, fontWeight: '700', color: INK, fontFamily: FONT },
  demoNote: { fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 18, fontFamily: FONT },
});
