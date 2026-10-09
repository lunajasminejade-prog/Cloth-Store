import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LOW_STOCK_THRESHOLD, ORDER_STATUSES, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { EmptyState } from '../components/buttons';
import { ScreenHead } from '../components/ScreenHead';

// Store-tools sales reports built from saved demo orders.
export default function ReportsScreen() {
  const shop = useShop();
  const r = shop.reports;
  const low = shop.allProducts.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Sales reports" onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.basis}>{r.basis}</Text>
        {shop.orders.length === 0 ? (
          <EmptyState title="No orders yet" sub="Place a demo order to see reports." />
        ) : (
          <>
            <View style={styles.grid}>
              <Stat label="Completed sales" value={peso(r.sales)} />
              <Stat label="Orders (excl. cancelled)" value={String(r.orderCount)} />
              <Stat label="Completed orders" value={String(r.completedCount)} />
              <Stat label="Avg. completed value" value={peso(r.avgCompleted)} />
            </View>
            <Text style={styles.sectionLabel}>Orders by status</Text>
            <View style={styles.card}>
              {ORDER_STATUSES.map((s) => (
                <View key={s} style={styles.kv}>
                  <Text style={styles.meta}>{s}</Text>
                  <Text style={styles.value}>{r.byStatus[s] || 0}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Best sellers</Text>
            <View style={styles.card}>
              {r.bestSellers.length === 0 ? (
                <Text style={styles.meta}>No sales yet.</Text>
              ) : (
                r.bestSellers.map((b) => (
                  <View key={String(b.productId)} style={styles.kv}>
                    <Text style={styles.meta}>{b.name} ({"\u00D7"}{b.qty})</Text>
                    <Text style={styles.value}>{peso(b.revenue)}</Text>
                  </View>
                ))
              )}
            </View>
            <Text style={styles.sectionLabel}>Sales trend (completed)</Text>
            <View style={styles.card}>
              {r.trend.length === 0 ? (
                <Text style={styles.meta}>No completed orders yet.</Text>
              ) : (
                r.trend.map((t) => (
                  <View key={t.day} style={styles.kv}>
                    <Text style={styles.meta}>{t.day} ({"\u00D7"}{t.orders})</Text>
                    <Text style={styles.value}>{peso(t.sales)}</Text>
                  </View>
                ))
              )}
            </View>
            <Text style={styles.sectionLabel}>Low stock ({"\u2264"}{LOW_STOCK_THRESHOLD})</Text>
            <View style={styles.card}>
              {low.length === 0 ? (
                <Text style={styles.meta}>All products are stocked.</Text>
              ) : (
                low.map((p) => (
                  <View key={p.id} style={styles.kv}>
                    <Text style={styles.meta}>{p.name}</Text>
                    <Text style={styles.value}>{p.stock} left</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  basis: { fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 18, fontFamily: FONT },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  stat: { flex: 1, minWidth: 140, borderWidth: 1, borderColor: FAINT_BORDER, borderRadius: 16, padding: 12, backgroundColor: TILE },
  statValue: { fontSize: 18, fontWeight: '700', color: DEEP, fontFamily: FONT },
  statLabel: { fontSize: 12, color: MUTED, marginTop: 4, fontFamily: FONT },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  card: { borderWidth: 1, borderColor: FAINT_BORDER, borderRadius: 16, padding: 12, marginTop: 8, gap: 8, backgroundColor: WHITE },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  meta: { fontSize: 14, color: MUTED, flex: 1, minWidth: 0, fontFamily: FONT },
  value: { fontSize: 14, fontWeight: '700', color: INK, fontFamily: FONT },
});
