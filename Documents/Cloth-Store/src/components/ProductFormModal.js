import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, IMAGE_KEYS, imageForKey, peso } from '../data/products';
import { pickProductImage } from '../services/avatar';
import { useShop } from '../store/ShopContext';
import { DEEP, FAINT_BORDER, FONT, INK, MUTED, TILE, WHITE } from '../theme';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Field } from './ScreenHead';

// Add/Edit product modal. Validates required text, finite non-negative
// prices, and non-negative integer stock; inserts via parameterized SQL.
export default function ProductFormModal() {
  const shop = useShop();
  const open = shop.productFormOpen;
  const editing = shop.editingProductId != null ? shop.productById(shop.editingProductId) : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Shirts');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [imageKey, setImageKey] = useState('hoodie-purple');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [picking, setPicking] = useState(false);
  const [pictureError, setPictureError] = useState(null);
  const pickingRef = useRef(false);
  const pictureRequest = useRef(0);

  useEffect(() => {
    pictureRequest.current += 1;
    if (open) {
      setName(editing ? editing.name : '');
      setCategory(editing ? editing.category : 'Shirts');
      setPrice(editing ? String(editing.price) : '');
      setStock(editing ? String(editing.stock) : '');
      setDescription(editing ? editing.description : '');
      setImageKey(editing ? editing.imageKey : 'hoodie-purple');
      setErrors({});
      setPictureError(null);
      setPicking(false);
      pickingRef.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    if (savingRef.current || pickingRef.current) return;
    shop.setProductFormOpen(false);
  }

  async function uploadPicture() {
    if (savingRef.current || pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    setPictureError(null);
    const request = pictureRequest.current;
    try {
      const result = await pickProductImage();
      if (request !== pictureRequest.current || result.canceled) return;
      if (result.error) {
        setPictureError(result.error);
        return;
      }
      setImageKey(result.dataUri);
    } finally {
      if (request === pictureRequest.current) {
        pickingRef.current = false;
        setPicking(false);
      }
    }
  }

  function validate() {
    const e = {};
    if (name.trim().length < 2) e.name = 'Enter a product name.';
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) e.price = 'Enter a valid non-negative price.';
    if (!editing) {
      const s = Number(stock);
      if (!Number.isInteger(s) || s < 0) e.stock = 'Enter a whole non-negative stock number.';
    }
    if (!CATEGORIES.includes(category) && category.trim().length < 2) e.category = 'Pick a category.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (savingRef.current || pickingRef.current) return;
    if (!validate()) {
      shop.flash('Please fix the highlighted fields.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (editing) {
        await shop.editProduct(editing.id, {
          name: name.trim(),
          category,
          price: Number(price),
          description: description.trim(),
          imageKey,
          categories: editing.categories.includes(category)
            ? editing.categories
            : [...editing.categories, category],
        });
      } else {
        await shop.addProduct({
          name: name.trim(),
          category,
          price: Number(price),
          stock: Number(stock),
          description: description.trim(),
          imageKey,
        });
      }
      shop.setProductFormOpen(false);
    } catch (e) {
      shop.flash(e && e.message ? e.message : 'Could not save the product.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View style={[styles.sheet, { width: Math.min(shop.width, 640), alignSelf: 'center' }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{editing ? 'Edit product' : 'Add product'}</Text>
          <Text style={styles.sub}>Local demo catalog — changes stay on this device.</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Field label="Name" value={name} onChange={setName} placeholder="e.g. Linen Overshirt" error={errors.name} />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === c }}
                  accessibilityLabel={c}
                >
                  <Text style={category === c ? styles.chipTextOn : styles.chipTextOff}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Price (\u20B1)" value={price} onChange={setPrice} placeholder="e.g. 1299" error={errors.price} keyboardType="numeric" />
            {!editing ? (
              <Field label="Initial stock (total units)" value={stock} onChange={setStock} placeholder="e.g. 36" error={errors.stock} keyboardType="numeric" />
            ) : (
              <Text style={styles.note}>Stock is edited per size/color on the Inventory screen.</Text>
            )}
            <Field label="Description" value={description} onChange={setDescription} placeholder="Fabric, fit, care\u2026" />
            <Text style={styles.label}>Product picture</Text>
            <View style={styles.pictureTile}>
              <Image source={imageForKey(imageKey)} style={styles.picture} resizeMode="contain" accessible accessibilityLabel="Product picture preview" />
            </View>
            <PrimaryButton
              label={picking ? 'Preparing picture…' : IMAGE_KEYS.includes(imageKey) ? 'Upload picture' : 'Change picture'}
              onPress={uploadPicture}
              disabled={saving || picking}
              style={{ marginTop: 8 }}
            />
            {pictureError ? <Text style={styles.pictureError} accessibilityRole="alert">{pictureError}</Text> : null}
            <Text style={styles.note}>Choose your own picture or use a sample below. Saved on this device.</Text>
            <View style={styles.chips}>
              {IMAGE_KEYS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => { setImageKey(k); setPictureError(null); }}
                  disabled={saving || picking}
                  style={[styles.chip, imageKey === k && styles.chipOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: imageKey === k }}
                  accessibilityLabel={{ 'hoodie-purple': 'Purple hoodie picture', 'knit-shirt': 'Knit shirt picture', 'essential-shirt': 'Essential shirt picture' }[k]}
                >
                  <Text style={imageKey === k ? styles.chipTextOn : styles.chipTextOff}>{{ 'hoodie-purple': 'Purple hoodie', 'knit-shirt': 'Knit shirt', 'essential-shirt': 'Essential shirt' }[k]}</Text>
                </Pressable>
              ))}
            </View>
            {price !== '' && Number.isFinite(Number(price)) ? (
              <Text style={styles.preview}>Price preview: {peso(Number(price))}</Text>
            ) : null}
            <View style={styles.btns}>
              <SecondaryButton label="Cancel" onPress={close} style={{ flex: 1 }} />
              <PrimaryButton label={saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'} onPress={save} disabled={saving || picking} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 24, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: FAINT_BORDER, alignSelf: 'center', marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: INK, marginTop: 8, fontFamily: FONT },
  sub: { fontSize: 14, color: MUTED, marginTop: 4, fontFamily: FONT },
  label: { fontSize: 14, fontWeight: '600', color: INK, marginTop: 12, marginBottom: 6, fontFamily: FONT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#8C56D4', alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  chipOn: { backgroundColor: DEEP, borderColor: DEEP },
  chipTextOn: { color: WHITE, fontSize: 14, fontWeight: '600', fontFamily: FONT },
  chipTextOff: { color: INK, fontSize: 14, fontWeight: '500', fontFamily: FONT },
  note: { fontSize: 12, color: MUTED, marginTop: 12, fontFamily: FONT },
  pictureTile: { height: 160, borderRadius: 16, backgroundColor: TILE, alignItems: 'center', justifyContent: 'center' },
  picture: { width: '90%', height: '90%' },
  pictureError: { fontSize: 13, color: '#B3261E', marginTop: 8, fontFamily: FONT },
  preview: { fontSize: 14, color: MUTED, marginTop: 12, fontFamily: FONT },
  btns: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
