import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../data/products';
import { useShop } from '../store/ShopContext';
import { FONT, INK, MUTED } from '../theme';
import { EmptyState, PrimaryButton } from '../components/buttons';
import ProductGrid from '../components/ProductGrid';
import { CategoryChips, SearchFilterBar } from '../components/SearchFilter';

// Figma Home frame: header, greeting, search, category chips, Trending grid.
export default function HomeScreen() {
  const shop = useShop();

  const header = (
    <View>
      <Text style={styles.hello}>Hello {shop.greetingName}</Text>
      <Text style={styles.tagline}>Fashion confidence and reveals beauty</Text>
      <SearchFilterBar query={shop.query} setQuery={shop.setQuery} openFilter={() => shop.setFilterOpen(true)} />
      <CategoryChips category={shop.category} setCategory={shop.setCategory} categories={CATEGORIES} />
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Trending now</Text>
        <Pressable onPress={shop.resetFilters} hitSlop={8} accessibilityRole="button" accessibilityLabel="View all products">
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => shop.navTo('profile', 'Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={8}
        >
          <Image source={shop.avatarSource} style={styles.avatar} />
        </Pressable>
        <Text style={styles.storeTitle}>Cloth Store</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={shop.openCartSheet} style={styles.bagBtn} hitSlop={8}>
          <Text style={styles.bagIcon}>{"\u{1F6CD}"}</Text>
          {shop.cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{shop.cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.body, { width: shop.avail + 32 }]}>
        {!shop.ready ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading your store\u2026</Text>
          </View>
        ) : shop.dbError && shop.allProducts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Catalog unavailable offline</Text>
            <Text style={styles.emptySub}>{shop.dbError}</Text>
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
              shop.category === 'Shoes' || shop.category === 'Bag' ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptySub}>
                    {`The demo catalog has no ${shop.category.toLowerCase()} products yet. Try Trending or Shirts, or add one in Store tools.`}
                  </Text>
                  <PrimaryButton label="Reset filters" onPress={shop.resetFilters} style={{ marginTop: 12 }} />
                </View>
              ) : (
                <EmptyState title="No products found" sub="Try a different search or reset the filters." actionLabel="Reset filters" onAction={shop.resetFilters} />
              )
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, paddingHorizontal: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1EBFA' },
  storeTitle: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  bagBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bagIcon: { fontSize: 24, color: INK },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#722F99', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 4, alignSelf: 'center' },
  hello: { fontSize: 24, fontWeight: '700', color: INK, marginTop: 16, fontFamily: FONT },
  tagline: { fontSize: 14, color: MUTED, marginTop: 8, fontFamily: FONT },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  viewAll: { fontSize: 14, fontWeight: '600', color: '#722F99', fontFamily: FONT },
  empty: { marginTop: 24, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, fontFamily: FONT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20, fontFamily: FONT },
});
