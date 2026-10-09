import { StyleSheet, Text, View } from 'react-native';
import { useShop } from '../store/ShopContext';
import { FONT, MUTED } from '../theme';
import { EmptyState } from '../components/buttons';
import ProductGrid from '../components/ProductGrid';
import { ScreenHead } from '../components/ScreenHead';

export default function WishlistScreen() {
  const shop = useShop();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Wishlist" onBack={shop.goBack} />
      <View style={[styles.body, { width: shop.avail + 32 }]}>
        {shop.favProducts.length === 0 ? (
          <EmptyState
            title="No saved items yet"
            sub="Tap the heart on any product to save it here."
            actionLabel="Go to Shop"
            onAction={() => shop.navTo('shop', 'Shop')}
          />
        ) : (
          <ProductGrid
            list={shop.favProducts}
            gap={shop.gap}
            cardW={shop.cardW}
            cols={shop.cols}
            favorites={shop.favorites}
            onOpen={shop.openDetails}
            onToggleFav={shop.toggleFav}
            headerNode={
              <Text style={styles.count}>
                {shop.favProducts.length} saved item{shop.favProducts.length === 1 ? '' : 's'}
              </Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 4, alignSelf: 'center' },
  count: { fontSize: 14, color: MUTED, marginTop: 8, fontFamily: FONT },
});
