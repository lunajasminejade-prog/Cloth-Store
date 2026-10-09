import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, WHITE } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import Avatar from '../components/Avatar';
import AvatarPreviewModal from '../components/AvatarPreviewModal';
import { Field } from '../components/ScreenHead';
import { pickProfileImage } from '../services/avatar';

const TOOLS = [
  ['products', '\u25A6', 'Products', 'Add, edit, delete catalog items'],
  ['inventory', '\u2261', 'Inventory', 'Stock by size/color, low stock'],
  ['orders-manage', '\u{1F6CD}', 'Orders & statuses', 'Pending to Cancelled (demo)'],
  ['reports', '\u25A4', 'Sales reports', 'Sales, best sellers, trends'],
  ['settings', '\u2699', 'Settings', 'Delivery fee, preferences'],
];

export default function ProfileScreen() {
  const shop = useShop();
  const [previewUri, setPreviewUri] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const [pickError, setPickError] = useState(null);
  const hasPic = !!shop.profilePicUri;

  async function startUpload() {
    setPickError(null);
    const res = await pickProfileImage();
    if (res.canceled) return; // user backed out: change nothing
    if (res.error) {
      setPickError(res.error);
      shop.flash(res.error);
      return;
    }
    setPreviewUri(res.dataUri);
    setPreviewOpen(true);
  }

  async function savePreview() {
    if (!previewUri || savingPic) return;
    setSavingPic(true);
    const ok = await shop.saveProfilePicture(previewUri);
    setSavingPic(false);
    if (ok) {
      setPreviewOpen(false);
      setPreviewUri(null);
      setPickError(null);
      shop.flash('Profile picture saved.');
    } else {
      setPickError('Could not save the picture on this device. Try again.');
    }
  }

  function cancelPreview() {
    if (savingPic) return;
    setPreviewOpen(false);
    setPreviewUri(null);
  }

  function requestRemove() {
    shop.setConfirm({
      title: 'Remove profile picture?',
      message: 'Your custom picture will be deleted and the default avatar restored.',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        shop.setConfirm(null);
        const ok = await shop.removeProfilePicture();
        shop.flash(ok ? 'Profile picture removed.' : 'Could not remove the picture. Try again.');
      },
    });
  }

  function openTool(id) {
    if (id === 'orders-manage') {
      shop.setManageOrders(true);
      shop.navTo('orders', 'Profile');
      return;
    }
    shop.navTo(id, 'Profile');
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.storeTitle}>Profile</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Avatar size={88} showCamera onPressCamera={startUpload} label="Your profile picture. Activate to upload." />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name}>{shop.profileName.trim() || 'Guest'}</Text>
            <Text style={styles.meta}>
              {shop.orders.length} orders {"\u00B7"} {shop.favCount} saved
            </Text>
          </View>
        </View>

        <PrimaryButton
          label={hasPic ? 'Change Profile Picture' : 'Upload Profile Picture'}
          onPress={startUpload}
          style={{ marginTop: 12 }}
        />
        {hasPic ? (
          <SecondaryButton label="Remove Profile Picture" onPress={requestRemove} style={{ marginTop: 8 }} />
        ) : null}

        <Text style={styles.sectionLabel}>Account (stored on this device only)</Text>
        <Field label="Name" value={shop.profileName} onChange={shop.setProfileName} placeholder="Your name" error={shop.profileError.name} />
        <Field label="Phone" value={shop.profilePhone} onChange={shop.setProfilePhone} placeholder="e.g. 09171234567" keyboardType="phone-pad" error={shop.profileError.phone} />
        <Field label="Address" value={shop.profileAddress} onChange={shop.setProfileAddress} placeholder="Street, barangay, city" error={shop.profileError.address} />
        <PrimaryButton label="Save profile" onPress={shop.saveProfile} style={{ marginTop: 12 }} />

        <Text style={styles.sectionLabel}>My stuff</Text>
        <Pressable style={styles.linkRow} onPress={() => { shop.setManageOrders(false); shop.navTo('orders', 'Profile'); }} accessibilityRole="button" accessibilityLabel="Open orders">
          <Text style={styles.glyph}>{"\u{1F6CD}"}</Text>
          <Text style={styles.linkLabel}>My Orders</Text>
          <Text style={styles.linkMeta}>{shop.orders.length}</Text>
          <Text style={styles.arrow}>{"\u203A"}</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => shop.navTo('wishlist', 'Profile')} accessibilityRole="button" accessibilityLabel="Open wishlist">
          <Text style={styles.glyph}>{"\u2665"}</Text>
          <Text style={styles.linkLabel}>Wishlist</Text>
          <Text style={styles.linkMeta}>{shop.favCount}</Text>
          <Text style={styles.arrow}>{"\u203A"}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Store tools (local demo)</Text>
        {TOOLS.map(([id, glyph, label, sub]) => (
          <Pressable key={id} style={styles.linkRow} onPress={() => openTool(id)} accessibilityRole="button" accessibilityLabel={`Open ${label}`}>
            <Text style={styles.glyph}>{glyph}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.linkLabel}>{label}</Text>
              <Text style={styles.linkSub}>{sub}</Text>
            </View>
            <Text style={styles.arrow}>{"\u203A"}</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>Settings</Text>
        <ToggleRow label="Order updates" hint="On-device reminders only — no push notifications." value={shop.notifyOrders} onToggle={() => shop.setNotifyOrders(!shop.notifyOrders)} />
        <ToggleRow label="Promo alerts" hint="On-device reminders only — no push notifications." value={shop.notifyPromos} onToggle={() => shop.setNotifyPromos(!shop.notifyPromos)} />
        <SecondaryButton label="Reset demo data" onPress={shop.resetDemo} style={{ marginTop: 12 }} />
        <View style={{ height: 24 }} />
      </ScrollView>
      <AvatarPreviewModal
        visible={previewOpen}
        uri={previewUri}
        saving={savingPic}
        error={pickError}
        onSave={savePreview}
        onCancel={cancelPreview}
      />
    </View>
  );
}

function ToggleRow({ label, hint, value, onToggle }) {
  return (
    <View>
      <Pressable style={styles.linkRow} onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
        <Text style={styles.linkLabel}>{label}</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.toggle, value && styles.toggleOn]}>
          <View style={[styles.knob, value && styles.knobOn]} />
        </View>
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 16 },
  storeTitle: { fontSize: 18, fontWeight: '700', color: INK, fontFamily: FONT },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  name: { fontSize: 20, fontWeight: '700', color: INK, fontFamily: FONT },
  meta: { fontSize: 14, color: MUTED, fontFamily: FONT },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 16, fontFamily: FONT },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: FAINT_BORDER,
    borderRadius: 16, padding: 12, marginTop: 8, backgroundColor: WHITE,
  },
  glyph: { fontSize: 20, color: DEEP, width: 28, textAlign: 'center' },
  linkLabel: { fontSize: 14, fontWeight: '600', color: INK, fontFamily: FONT },
  linkSub: { fontSize: 12, color: MUTED, marginTop: 2, fontFamily: FONT },
  linkMeta: { fontSize: 14, color: MUTED, marginLeft: 'auto', fontFamily: FONT },
  arrow: { fontSize: 20, color: '#8C56D4' },
  hint: { fontSize: 12, color: MUTED, marginTop: 4, marginLeft: 4, fontFamily: FONT },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#D9CFE8', padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: DEEP },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: WHITE },
  knobOn: { alignSelf: 'flex-end' },
});
