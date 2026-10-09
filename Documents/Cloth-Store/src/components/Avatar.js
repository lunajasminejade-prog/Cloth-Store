import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, WHITE } from '../theme';

// Circular user avatar with a subtle border and an optional camera badge.
// Always renders the single saved profile image (or the default avatar).
export default function Avatar({ size = 64, showCamera = false, onPress, onPressCamera, label = 'Profile picture' }) {
  const shop = useShop();
  const badge = Math.max(24, Math.round(size * 0.36));

  const img = (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={shop.avatarSource} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} resizeMode="cover" accessibilityLabel={label} />
      {showCamera ? (
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2, right: -2, bottom: -2 }]}>
          <Text style={[styles.badgeGlyph, { fontSize: Math.round(badge * 0.55) }]}>{"\u{1F4F7}"}</Text>
        </View>
      ) : null}
    </View>
  );

  const action = onPressCamera || onPress;
  if (!action) return img;
  return (
    <Pressable
      onPress={action}
      accessibilityRole="button"
      accessibilityLabel={onPressCamera ? 'Upload profile picture' : label}
      hitSlop={8}
    >
      {img}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: WHITE, borderWidth: 2, borderColor: FAINT_BORDER,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  badge: {
    position: 'absolute', backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: WHITE,
  },
  badgeGlyph: { color: WHITE, fontFamily: FONT },
});
