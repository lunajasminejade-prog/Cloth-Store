import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LOW_STOCK_THRESHOLD, imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { EmptyState } from '../components/buttons';
import { ScreenHead } from '../components/ScreenHead';

// Store-tools inventory: per size/color stock editing with SQL updates that
// never go negative, plus low-stock information.
export default function InventoryScreen() {
  const shop = useShop();
  const low = shop.allProducts.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Inventory" onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>Demo stock values stored in SQLite — not live inventory.</Text>
        {low.length > 0 ? (
          <View style={styles.lowCard}>
            <Text style={styles.lowTitle}>Low stock ({"\u2264"}{LOW_STOCK_THRESHOLD} units)</Text>
            {low.map((p) => (
              <Text key={p.id} style={styles.lowLine}>{p.name} — {p.stock} left</Text>
            ))}
          </View>
        ) : null}
        {shop.allProducts.length === 0 ? (
          <EmptyState title="No products" sub="Add products to manage inventory." />
        ) : (
          shop.allProducts.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.productHead}>
                <Image source={imageForKey(p.imageKey)} style={styles.thumb} resizeMode="contain" accessible accessibilityLabel={`Picture of ${p.name}`} />
                <View style={styles.productInfo}>
                  <View style={styles.kv}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.total}>{p.stock} total</Text>
                  </View>
                  <Text style={styles.meta}>{p.category} {"\u00B7"} {peso(p.price)}</Text>
                </View>
              </View>
              {(shop.variantsMap[p.id] || []).map((v) => (
                <View key={`${v.size}|${v.color}`} style={styles.vrow}>
                  <Text style={styles.vlabel}>{v.size} {"\u00B7"} {v.color}</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => shop.adjustStock(p.id, v.size, v.color, -1)}
                      disabled={v.stock <= 0}
                      style={styles.stepBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease stock ${p.name} ${v.size} ${v.color}`}
                      hitSlop={8}
                    >
                      <Text style={[styles.stepGlyph, v.stock <= 0 && styles.stepDisabled]}>{"\u2212"}</Text>
                    </Pressable>
                    <Text style={styles.stepQty}>{v.stock}</Text>
                    <Pressable
                      onPress={() => shop.adjustStock(p.id, v.size, v.color, 1)}
                      style={styles.stepBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase stock ${p.name} ${v.size} ${v.color}`}
                      hitSlop={8}
                    >
                      <Text style={styles.stepGlyph}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable onPress={() => shop.setAvailable(p.id, !p.available)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Toggle availability of ${p.name}`}>
                <Text style={styles.link}>{p.available ? 'Hide product' : 'Show product'}</Text>
              </Pressable>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  note: { fontSize: 12, color: MUTED, marginTop: 8, fontFamily: FONT },
  lowCard: { borderWidth: 1, borderColor: DEEP, borderRadius: 16, padding: 12, marginTop: 12, backgroundColor: TILE, gap: 4 },
  lowTitle: { fontSize: 14, fontWeight: '700', color: DEEP, fontFamily: FONT },
  lowLine: { fontSize: 13, color: INK, fontFamily: FONT },
  card: { borderWidth: 1, borderColor: FAINT_BORDER, borderRadius: 16, padding: 12, marginTop: 12, gap: 6, backgroundColor: WHITE },
  productHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  productInfo: { flex: 1, minWidth: 0, gap: 4 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: TILE },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 14, fontWeight: '600', color: INK, flex: 1, minWidth: 0, fontFamily: FONT },
  total: { fontSize: 14, fontWeight: '700', color: DEEP, fontFamily: FONT },
  meta: { fontSize: 13, color: MUTED, fontFamily: FONT },
  vrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#F0EAF7' },
  vlabel: { fontSize: 13, color: INK, fontFamily: FONT },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TILE, borderRadius: 12, paddingHorizontal: 4, height: 32 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 16, color: DEEP, fontWeight: '700' },
  stepDisabled: { color: MUTED, opacity: 0.4 },
  stepQty: { fontSize: 14, fontWeight: '600', color: INK, minWidth: 24, textAlign: 'center', fontFamily: FONT },
  link: { fontSize: 14, fontWeight: '600', color: DEEP, marginTop: 4, fontFamily: FONT },
});
