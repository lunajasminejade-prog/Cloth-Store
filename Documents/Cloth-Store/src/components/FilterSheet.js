import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRICE_CAPS, SORTS } from '../data/products';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, TILE, WHITE } from '../theme';
import { PrimaryButton, SecondaryButton } from './buttons';

// Shared sort / price / favorites filter used by Home and Shop.
export default function FilterSheet() {
  const shop = useShop();
  const { filterOpen, setFilterOpen, sort, setSort, maxPrice, setMaxPrice, favOnly, setFavOnly } = shop;

  return (
    <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)}>
        <Pressable style={[styles.sheet, { width: Math.min(shop.width - 48, 420) }]} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={styles.title}>Filter</Text>
            <Text style={styles.label}>Sort by</Text>
            {SORTS.map(([v, label]) => (
              <Option key={v} selected={sort === v} label={label} onPress={() => setSort(v)} />
            ))}
            <Text style={styles.label}>Price</Text>
            {PRICE_CAPS.map(([v, label]) => (
              <Option key={v} selected={maxPrice === v} label={label} onPress={() => setMaxPrice(v)} />
            ))}
            <Option selected={favOnly} label="Favorites only" onPress={() => setFavOnly(!favOnly)} checkbox={favOnly} />
            <View style={styles.btns}>
              <SecondaryButton
                label="Reset"
                onPress={() => {
                  setSort('featured');
                  setFavOnly(false);
                  setMaxPrice('all');
                }}
              />
              <PrimaryButton label="Apply" onPress={() => setFilterOpen(false)} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({ selected, label, onPress, checkbox }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowOn]}
      accessibilityRole={checkbox !== undefined ? 'checkbox' : 'radio'}
      accessibilityState={checkbox !== undefined ? { checked: selected } : { selected }}
    >
      <View style={[styles.dot, selected && styles.dotOn]} />
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: WHITE, borderRadius: 24, padding: 16, gap: 12, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: FAINT_BORDER, alignSelf: 'center', marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: INK, fontFamily: FONT },
  label: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: FAINT_BORDER, marginTop: 8,
  },
  rowOn: { borderColor: DEEP, backgroundColor: TILE },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#8C56D4' },
  dotOn: { borderColor: DEEP, backgroundColor: DEEP },
  rowLabel: { fontSize: 14, color: INK, fontFamily: FONT },
  btns: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
