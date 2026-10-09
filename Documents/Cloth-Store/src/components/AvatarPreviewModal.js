import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { DEEP, FONT, INK, MUTED, WHITE } from '../theme';
import { PrimaryButton, SecondaryButton } from './buttons';

// Preview the selected picture as a circular avatar before saving.
export default function AvatarPreviewModal({ visible, uri, saving, error, onSave, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Preview</Text>
          {uri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri }} style={styles.preview} resizeMode="cover" accessibilityLabel="Selected profile picture preview" />
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.note}>It will appear as a circle everywhere your avatar shows.</Text>
          <View style={styles.btns}>
            <SecondaryButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <PrimaryButton
              label={saving ? 'Saving\u2026' : 'Save Picture'}
              onPress={onSave}
              disabled={saving || !uri}
              style={{ flex: 1 }}
            />
          </View>
          {saving ? <ActivityIndicator size="small" color={DEEP} style={{ marginTop: 12 }} accessibilityLabel="Saving picture" /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: WHITE, borderRadius: 24, padding: 20, alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: INK, fontFamily: FONT },
  previewWrap: {
    width: 208, height: 208, borderRadius: 104, backgroundColor: '#F1EBFA',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    borderWidth: 2, borderColor: 'rgba(140,86,212,0.15)',
  },
  preview: { width: 200, height: 200, borderRadius: 100 },
  note: { fontSize: 12, color: MUTED, textAlign: 'center', fontFamily: FONT },
  error: { fontSize: 13, color: '#B3261E', textAlign: 'center', fontFamily: FONT },
  btns: { flexDirection: 'row', gap: 8, marginTop: 8, width: '100%' },
});
