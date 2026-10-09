import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, WHITE } from '../theme';
import { PrimaryButton, SecondaryButton } from './buttons';

// Shared destructive-action confirmation (reset demo, delete product).
// Cancel changes nothing.
export default function ConfirmModal() {
  const shop = useShop();
  const c = shop.confirm;
  return (
    <Modal visible={!!c} transparent animationType="fade" onRequestClose={() => shop.setConfirm(null)}>
      <Pressable style={styles.backdrop} onPress={() => shop.setConfirm(null)}>
        <Pressable style={[styles.sheet, { width: Math.min(shop.width - 48, 420) }]} onPress={() => {}}>
          <Text style={styles.title}>{c ? c.title : ''}</Text>
          <Text style={styles.message}>{c ? c.message : ''}</Text>
          <View style={styles.btns}>
            <SecondaryButton label="Cancel" onPress={() => shop.setConfirm(null)} style={{ flex: 1 }} />
            <PrimaryButton
              label={c ? c.confirmLabel || 'Confirm' : 'Confirm'}
              onPress={() => c && c.onConfirm && c.onConfirm()}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: WHITE, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: FAINT_BORDER },
  title: { fontSize: 20, fontWeight: '700', color: INK, fontFamily: FONT },
  message: { fontSize: 14, color: MUTED, lineHeight: 20, fontFamily: FONT },
  btns: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
