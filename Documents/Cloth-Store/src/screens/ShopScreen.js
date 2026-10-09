import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../data/products';
import { useShop } from '../store/ShopContext';
import { FONT, INK, MUTED } from '../theme';
import { EmptyState } from '../components/buttons';
import ProductGrid from '../components/ProductGrid';
import { CategoryChips, SearchFilterBar } from '../components/SearchFilter';

export default function ShopScreen() {
  const shop = useShop();

  const header = (
    <View>
      <Text style={styles.tagline}>Browse the full catalog.</Text>
      <SearchFilterBar query={shop.query} setQuery={shop.setQuery} openFilter={() => shop.setFilterOpen(true)} />
      <CategoryChips category={shop.category} setCategory={shop.setCategory} categories={CATEGORIES} />
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {shop.filtered.length} product{shop.filtered.length === 1 ? '' : 's'}
        </Text>
        <Pressable onPress={shop.resetFilters} hitSlop={8} accessibilityRole="button" accessibilityLabel="Reset filters">
          <Text style={styles.viewAll}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.storeTitle}>Shop</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => shop.navTo('wishlist', 'Shop')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Open wishlist" hitSlop={8}>
            <Text style={styles.icon}>{"\u2665"}</Text>
            {shop.favCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{shop.favCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={shop.openCartSheet} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.icon}>{"\u{1F6CD}"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.body, { width: shop.avail + 32 }]}>
        {!shop.ready ? (
          <View style={styles.loading}>
            <Text style={styles.tagline}>Loading your store\u2026</Text>
          </View>
        ) : (
          <ProductGrid
            list={shop.filtered}
            gap={shop.gap}
            cardW={shop.cardW}
            cols={shop.cols}
            favorites={shop.favorites}
            onOpen={shop.openDetails}
            onToggleFav={shop.toggleFav}
            headerNode={header}
            emptyNode={
              <EmptyState title="No products found" sub="Try a different search or reset the filters." actionLabel="Reset filters" onAction={shop.resetFilters} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, paddingHorizontal: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  storeTitle: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24, color: INK },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#722F99', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 4, alignSelf: 'center' },
  tagline: { fontSize: 14, color: MUTED, marginTop: 8, fontFamily: FONT },
  loading: { marginTop: 24, alignItems: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  viewAll: { fontSize: 14, fontWeight: '600', color: '#722F99', fontFamily: FONT },
});
