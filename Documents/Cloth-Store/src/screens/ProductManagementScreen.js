import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { EmptyState, PrimaryButton } from '../components/buttons';
import { ScreenHead } from '../components/ScreenHead';

// Store-tools product management: add, edit, delete. Deletion is confirmed
// and cleans up cart/wishlist references; order snapshots are preserved.
export default function ProductManagementScreen() {
  const shop = useShop();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead
        title="Products"
        onBack={shop.goBack}
        right={
          <Pressable onPress={() => shop.openProductForm(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add product">
            <Text style={styles.add}>+ Add</Text>
          </Pressable>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>Local demo catalog stored in SQLite. Works offline.</Text>
        {shop.allProducts.length === 0 ? (
          <EmptyState title="No products" sub="Add your first demo product." actionLabel="Add product" onAction={() => shop.openProductForm(null)} />
        ) : (
          shop.allProducts.map((p) => (
            <View key={p.id} style={styles.card}>
              <Image source={imageForKey(p.imageKey)} style={styles.thumb} resizeMode="contain" accessible accessibilityLabel={`Picture of ${p.name}`} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.meta}>{p.category} {"\u00B7"} {peso(p.price)} {"\u00B7"} {p.stock} in stock</Text>
                {!p.available ? <Text style={styles.hidden}>Hidden (out of stock or disabled)</Text> : null}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => shop.openProductForm(p.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${p.name}`}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => shop.deleteProduct(p.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${p.name}`}>
                  <Text style={styles.danger}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        <PrimaryButton label="Add product" onPress={() => shop.openProductForm(null)} style={{ marginTop: 16 }} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  add: { fontSize: 16, fontWeight: '700', color: DEEP, fontFamily: FONT },
  note: { fontSize: 12, color: MUTED, marginTop: 8, fontFamily: FONT },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: FAINT_BORDER,
    borderRadius: 16, padding: 10, marginTop: 10, backgroundColor: WHITE,
  },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: TILE },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  meta: { fontSize: 13, color: MUTED, marginTop: 2, fontFamily: FONT },
  hidden: { fontSize: 12, color: DEEP, marginTop: 2, fontFamily: FONT },
  actions: { gap: 8, alignItems: 'flex-end' },
  link: { fontSize: 14, fontWeight: '600', color: DEEP, fontFamily: FONT },
  danger: { fontSize: 14, fontWeight: '600', color: '#B3261E', fontFamily: FONT },
});
