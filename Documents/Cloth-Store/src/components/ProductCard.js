import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { imageForKey, peso } from '../data/products';
import { DEEP, FONT, INK, PURPLE, RADIUS, TILE, WHITE } from '../theme';

// Compact product card: contained image tile, heart action, name, price.
export default function ProductCard({ product, width, fav, onOpen, onToggleFav }) {
  const source = product.image || imageForKey(product.imageKey);
  return (
    <Pressable
      onPress={() => onOpen(product.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.name}`}
      style={[styles.card, { width }]}
    >
      <View style={styles.tile}>
        <Image source={source} style={styles.tileImg} resizeMode="contain" />
        <Pressable
          onPress={() => onToggleFav(product.id)}
          style={styles.heartBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={fav ? `Unfavorite ${product.name}` : `Favorite ${product.name}`}
        >
          <Text style={[styles.heart, fav && styles.heartOn]}>{"\u2665"}</Text>
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.price}>{peso(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE, borderRadius: RADIUS, overflow: 'hidden',
    shadowColor: INK, shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  tile: {
    backgroundColor: TILE, borderRadius: RADIUS,
    aspectRatio: 171 / 208, alignItems: 'center', justifyContent: 'center',
  },
  tileImg: { width: '88%', height: '88%' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  heart: { fontSize: 20, color: PURPLE },
  heartOn: { color: DEEP },
  info: { padding: 8, gap: 8 },
  name: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  price: { fontSize: 16, fontWeight: '700', color: DEEP, fontFamily: FONT },
});
