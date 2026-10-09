import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACTION_H, DEEP, FONT, INK, RADIUS, WHITE } from '../theme';

// Compact 48px actions matching the Figma buttons.
export function PrimaryButton({ label, onPress, disabled, style }) {
  return (
    <Pressable
      style={[styles.btn, styles.solid, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.solidText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }) {
  return (
    <Pressable style={[styles.btn, styles.ghost, style]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, sub, actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub ? <Text style={styles.emptySub}>{sub}</Text> : null}
      {actionLabel ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={{ marginTop: 12 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: ACTION_H, borderRadius: RADIUS, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  solid: { backgroundColor: DEEP, borderWidth: 1, borderColor: DEEP },
  solidText: { color: WHITE, fontSize: 16, fontWeight: '600', fontFamily: FONT },
  ghost: { backgroundColor: WHITE, borderWidth: 1, borderColor: DEEP },
  ghostText: { color: DEEP, fontSize: 16, fontWeight: '600', fontFamily: FONT },
  disabled: { opacity: 0.5 },
  empty: { marginTop: 24, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, fontFamily: FONT },
  emptySub: { fontSize: 14, color: 'rgba(28,16,48,0.65)', textAlign: 'center', marginTop: 8, lineHeight: 20, fontFamily: FONT },
});
