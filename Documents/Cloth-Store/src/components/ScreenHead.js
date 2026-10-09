import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ERROR, FAINT_BORDER, FONT, INK, MUTED, RADIUS, WHITE } from '../theme';

// Back header used by Details, Wishlist, Checkout, Orders, and Order Details.
export function ScreenHead({ title, onBack, right }) {
  return (
    <View style={styles.head}>
      <Pressable onPress={onBack} style={styles.circleBtn} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
        <Text style={styles.glyph}>{"\u2190"}</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right || <View style={{ width: 40 }} />}
    </View>
  );
}

// Labeled input with an inline validation error.
export function Field({ label, value, onChange, placeholder, error, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType || 'default'}
        style={[styles.input, error && styles.inputErr]}
        accessibilityLabel={label}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 16 },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  glyph: { fontSize: 20, color: INK },
  title: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  field: { marginTop: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: INK, marginBottom: 6, fontFamily: FONT },
  input: {
    minHeight: 48, borderRadius: RADIUS, borderWidth: 1, borderColor: FAINT_BORDER,
    backgroundColor: WHITE, paddingHorizontal: 14, fontSize: 14, color: INK, fontFamily: FONT,
  },
  inputErr: { borderColor: ERROR },
  error: { fontSize: 12, color: ERROR, marginTop: 4, fontFamily: FONT },
});
