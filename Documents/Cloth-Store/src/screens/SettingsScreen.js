import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { peso } from '../data/products';
import { useShop } from '../store/ShopContext';
import { FONT, INK, MUTED } from '../theme';
import { SecondaryButton } from '../components/buttons';
import { Field, ScreenHead } from '../components/ScreenHead';

export default function SettingsScreen() {
  const shop = useShop();

  function saveFee() {
    const v = Number(shop.deliveryFee);
    if (!Number.isFinite(v) || v < 0) {
      shop.flash('Enter a valid non-negative delivery fee.');
      return;
    }
    shop.flash('Settings saved on this device.');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Settings" onBack={shop.goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Delivery (demo)</Text>
        <Field
          label="Delivery fee (\u20B1)"
          value={String(shop.deliveryFee)}
          onChange={(t) => {
            const n = Number(t);
            shop.setDeliveryFee(t === '' ? 0 : Number.isFinite(n) ? n : shop.deliveryFee);
          }}
          placeholder="150"
          keyboardType="numeric"
        />
        <Text style={styles.note}>Default is {peso(150)}. Past orders keep the fee saved at checkout.</Text>
        <SecondaryButton label="Save settings" onPress={saveFee} style={{ marginTop: 12 }} />

        <Text style={styles.sectionLabel}>Demo data</Text>
        <Text style={styles.note}>Restores the demo catalog and inventory; clears cart, wishlist, and orders. Your profile and preferences are kept.</Text>
        <SecondaryButton label="Reset demo data" onPress={shop.resetDemo} style={{ marginTop: 12 }} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  note: { fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 18, fontFamily: FONT },
});
