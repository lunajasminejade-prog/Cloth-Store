import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DEEP, FONT, MUTED, WHITE } from '../theme';

export default function BottomNav({ active, onGo, cartCount }) {
  const items = [
    ['Home', '\u2302'],
    ['Shop', '\u25A6'],
    ['Cart', '\u{1F6CD}'],
    ['Profile', '\u25CB'],
  ];
  return (
    <View style={styles.nav}>
      {items.map(([label, glyph]) => {
        const on = label === active;
        return (
          <Pressable
            key={label}
            onPress={() => onGo(label)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <Text style={[styles.glyph, on && styles.on]}>{glyph}</Text>
            <Text style={[styles.label, on ? styles.on : styles.off]}>{label}</Text>
            {label === 'Cart' && cartCount > 0 ? (
              <View style={styles.dot}>
                <Text style={styles.dotText}>{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row', backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: '#F0EAF7',
    paddingBottom: 12, paddingTop: 6, shadowColor: '#1C1030',
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 8,
  },
  item: { flex: 1, minWidth: 0, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  glyph: { fontSize: 22, color: MUTED },
  label: { fontSize: 14, fontFamily: FONT },
  on: { color: DEEP, fontWeight: '600' },
  off: { color: MUTED, fontWeight: '400' },
  dot: {
    position: 'absolute', top: 4, right: '28%', minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  dotText: { color: WHITE, fontSize: 11, fontWeight: '700' },
});
