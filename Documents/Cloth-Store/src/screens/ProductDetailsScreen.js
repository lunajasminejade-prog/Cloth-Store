import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SIZES, imageForKey, peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, PURPLE, RADIUS, TILE, WHITE } from '../theme';
import { EmptyState, PrimaryButton, SecondaryButton } from '../components/buttons';

// Figma Details frame: gallery, name + stepper, price, color swatches,
// size chips, description, Add to Cart / Buy Now. Size chips and color
// swatches keep their positions; unavailable variants use a consistent
// disabled state driven by demo inventory.
export default function ProductDetailsScreen() {
  const shop = useShop();
  const { product, maxW, favorites, toggleFav, goBack, colorOptions } = shop;

  const [size, setSize] = useState('M');
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);

  if (!product) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title="Product not found" sub="It may have been deleted." actionLabel="Back to Shop" onAction={() => shop.navTo('shop', 'Shop')} />
      </View>
    );
  }

  const wide = maxW > 640;
  const fav = !!favorites[product.id];
  const source = product.image || imageForKey(product.imageKey);
  const soldOut = !shop.isPurchasable(product);
  const colorName = colorOptions[colorIdx].name;
  const variantHave = shop.variantStock(product.id, size, colorName);
  const variantGone = variantHave <= 0;
  const maxQty = Math.max(1, Math.min(99, variantHave - shop.cartQtyFor(product.id, size, colorName)));

  function selection() {
    return { productId: product.id, size, color: colorName, qty };
  }

  function clampQty(next) {
    setQty(Math.max(1, Math.min(next, maxQty)));
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Pressable onPress={goBack} style={styles.circleBtn} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
          <Text style={styles.glyph}>{"\u2190"}</Text>
        </Pressable>
        <Text style={styles.title}>Details</Text>
        <Pressable
          onPress={() => toggleFav(product.id)}
          style={[styles.circleBtn, styles.tint]}
          accessibilityRole="button"
          accessibilityLabel="Toggle favorite"
          hitSlop={8}
        >
          <Text style={[styles.glyph, fav && styles.heartOn]}>{"\u2665"}</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.gallery, wide && styles.galleryWide]}>
          <View style={styles.mainWrap}>
            <Image key={thumb} source={source} style={styles.mainImg} resizeMode="contain" />
          </View>
          <View style={styles.thumbs}>
            {[0, 1, 2].map((t) => (
              <Pressable
                key={t}
                onPress={() => setThumb(t)}
                style={[styles.thumbBtn, thumb === t && styles.thumbBtnOn]}
                accessibilityRole="button"
                accessibilityLabel={`View image ${t + 1}`}
              >
                <Image source={source} style={styles.thumbImg} resizeMode="contain" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.buyRow}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => clampQty(qty - 1)}
              disabled={qty <= 1}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              hitSlop={8}
            >
              <Text style={[styles.stepGlyph, qty <= 1 && styles.stepDisabled]}>{"\u2212"}</Text>
            </Pressable>
            <Text style={styles.stepQty}>{String(qty).padStart(2, '0')}</Text>
            <Pressable
              onPress={() => clampQty(qty + 1)}
              disabled={qty >= maxQty}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              hitSlop={8}
            >
              <Text style={[styles.stepGlyph, qty >= maxQty && styles.stepDisabled]}>+</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.fromPrice}>From: {peso(product.price)}</Text>
        {soldOut ? (
          <Text style={styles.stockNote}>Out of stock (demo inventory).</Text>
        ) : variantGone ? (
          <Text style={styles.stockNote}>Size {size} in {colorName} is out of stock — pick another combination.</Text>
        ) : (
          <Text style={styles.stockNote}>{variantHave} available in {size}/{colorName} (demo stock).</Text>
        )}

        <View style={styles.colorRow}>
          {colorOptions.map((c, i) => {
            const anyLeft = SIZES.some((s) => shop.variantStock(product.id, s, c.name) > 0);
            return (
              <Pressable
                key={c.name}
                onPress={() => anyLeft && setColorIdx(i)}
                disabled={!anyLeft}
                style={[styles.swatch, i === colorIdx && styles.swatchOn, !anyLeft && styles.swatchOff, { backgroundColor: c.hex }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: i === colorIdx }}
                accessibilityLabel={`${c.name}${anyLeft ? '' : ' (out of stock)'}`}
                hitSlop={4}
              />
            );
          })}
          <Text style={styles.colorName}>{colorName}</Text>
        </View>

        <Text style={styles.sectionLabel}>Select Size</Text>
        <View style={styles.sizeRow}>
          {SIZES.map((s) => {
            const on = s === size;
            const left = shop.variantStock(product.id, s, colorName);
            const off = left <= 0;
            return (
              <Pressable
                key={s}
                onPress={() => !off && (setSize(s), setQty(1))}
                disabled={off}
                style={[styles.sizeChip, on ? styles.sizeOn : styles.sizeOff, off && styles.sizeDisabled]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Size ${s}${off ? ' (out of stock)' : ''}`}
              >
                <Text style={on ? styles.sizeTextOn : off ? styles.sizeTextDisabled : styles.sizeTextOff}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {product.description}
        </Text>
      </ScrollView>

      <View style={styles.actionsBar}>
        <SecondaryButton label="Add to Cart" onPress={() => shop.addToCart(selection(), false)} style={{ flex: 1 }} />
        <PrimaryButton label="Buy Now" onPress={() => shop.addToCart(selection(), true)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 16 },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  tint: { backgroundColor: TILE },
  glyph: { fontSize: 20, color: INK },
  heartOn: { color: DEEP },
  title: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 980, width: '100%', alignSelf: 'center' },
  gallery: { backgroundColor: TILE, borderRadius: RADIUS, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, minHeight: 300 },
  galleryWide: { minHeight: 340 },
  mainWrap: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  mainImg: { width: '100%', aspectRatio: 1, maxHeight: 300 },
  thumbs: { width: 56, gap: 8 },
  thumbBtn: { width: 56, height: 56, borderRadius: RADIUS, backgroundColor: WHITE, borderWidth: 1, borderColor: FAINT_BORDER, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbBtnOn: { borderWidth: 2, borderColor: DEEP },
  thumbImg: { width: 48, height: 48 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16, minHeight: 48 },
  name: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700', color: INK, lineHeight: 24, fontFamily: FONT },
  stepper: {
    width: 104, height: 40, borderRadius: RADIUS, backgroundColor: TILE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8,
  },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 18, color: DEEP, fontWeight: '700' },
  stepDisabled: { color: MUTED, opacity: 0.4 },
  stepQty: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  fromPrice: { fontSize: 16, fontWeight: '700', color: DEEP, marginTop: 8, fontFamily: FONT },
  stockNote: { fontSize: 12, color: MUTED, marginTop: 4, fontFamily: FONT },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, height: 32 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: FAINT_BORDER },
  swatchOn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: DEEP },
  swatchOff: { opacity: 0.3 },
  colorName: { fontSize: 14, color: MUTED, marginLeft: 8, fontFamily: FONT },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  sizeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sizeChip: { flex: 1, minWidth: 0, height: 40, borderRadius: RADIUS, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sizeOn: { backgroundColor: DEEP, borderColor: DEEP },
  sizeOff: { backgroundColor: WHITE, borderColor: PURPLE },
  sizeDisabled: { backgroundColor: TILE, borderColor: FAINT_BORDER, opacity: 0.6 },
  sizeTextOn: { color: WHITE, fontSize: 14, fontWeight: '700', fontFamily: FONT },
  sizeTextOff: { color: INK, fontSize: 14, fontWeight: '500', fontFamily: FONT },
  sizeTextDisabled: { color: MUTED, fontSize: 14, fontWeight: '500', fontFamily: FONT },
  desc: { fontSize: 14, color: MUTED, lineHeight: 20, marginTop: 8, fontFamily: FONT },
  actionsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: '#F0EAF7',
  },
});
