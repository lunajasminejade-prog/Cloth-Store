import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DEEP, FONT, INK, MUTED, RADIUS, TILE, WHITE } from '../theme';

export function SearchFilterBar({ query, setQuery, openFilter }) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>{"\u2315"}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search clothing"
          placeholderTextColor={MUTED}
          style={styles.searchInput}
          accessibilityLabel="Search clothing"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Text style={styles.clearX}>{"\u00D7"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable style={styles.filterBtn} onPress={openFilter} accessibilityRole="button" accessibilityLabel="Open filters">
        <Text style={styles.filterIcon}>{"\u2630"}</Text>
        <Text style={styles.filterText}>Filter</Text>
      </Pressable>
    </View>
  );
}

export function CategoryChips({ category, setCategory, categories }) {
  return (
    <View style={styles.chipsWrap}>
      {categories.map((c) => {
        const on = c === category;
        return (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
          >
            <Text style={on ? styles.chipTextOn : styles.chipTextOff}>{c}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  searchBox: {
    flex: 1, minWidth: 0, height: 48, backgroundColor: TILE, borderRadius: RADIUS,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8,
  },
  searchIcon: { fontSize: 18, color: MUTED },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: INK, fontFamily: FONT },
  clearX: { fontSize: 20, color: MUTED },
  filterBtn: {
    width: 96, height: 48, borderRadius: RADIUS, backgroundColor: DEEP,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  filterIcon: { fontSize: 16, color: WHITE },
  filterText: { color: WHITE, fontSize: 14, fontWeight: '600', fontFamily: FONT },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { height: 40, paddingHorizontal: 18, borderRadius: RADIUS, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#8C56D4', borderColor: '#8C56D4' },
  chipOff: { backgroundColor: WHITE, borderColor: '#8C56D4' },
  chipTextOn: { color: WHITE, fontSize: 14, fontWeight: '600', fontFamily: FONT },
  chipTextOff: { color: INK, fontSize: 14, fontWeight: '500', fontFamily: FONT },
});
