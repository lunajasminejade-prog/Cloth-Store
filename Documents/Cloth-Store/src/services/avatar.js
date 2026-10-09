import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Picks a profile image from the device gallery (Android/iOS) or the browser
// file picker (Web, including Windows Downloads/Pictures folders).
// Returns { ok, dataUri } on success, { canceled: true } when the user backs
// out, or { error } for permission/validation/picker failures.
const MAX_DATA_URI_CHARS = 7 * 1024 * 1024; // keep AsyncStorage writes small

export async function pickProfileImage() {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return { error: 'Photo access was denied. Allow gallery access to choose a picture.' };
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // square crop UI on Android/iOS; ignored on web
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return { canceled: true };
    const asset = result.assets && result.assets[0];
    if (!asset || asset.type && asset.type !== 'image') {
      return { error: 'That file is not a supported image. Choose a JPG or PNG picture.' };
    }
    if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
      return { error: `Unsupported file type (${asset.mimeType}). Choose a JPG or PNG picture.` };
    }
    if (!asset.base64) {
      return { error: 'Could not read that image. Try a different JPG or PNG file.' };
    }
    const mime = asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
    const dataUri = `data:${mime};base64,${asset.base64}`;
    if (dataUri.length > MAX_DATA_URI_CHARS) {
      return { error: 'That image is too large. Choose a smaller picture.' };
    }
    return { ok: true, dataUri };
  } catch (e) {
    return { error: (e && e.message) || 'The image picker failed. Try again.' };
  }
}

// Product photos keep their aspect ratio and are stored in SQLite as compact
// data URIs, rather than gallery/cache URLs that can disappear after a restart.
// PNGs keep transparency; other formats are converted to JPEG.
export async function pickProductImage() {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { error: 'Allow gallery access to choose a product picture.' };
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: false, quality: 1,
    });
    if (result.canceled) return { canceled: true };
    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri || (asset.type && asset.type !== 'image') ||
        (asset.mimeType && !asset.mimeType.startsWith('image/')) ||
        !Number.isFinite(asset.width) || asset.width <= 0 ||
        !Number.isFinite(asset.height) || asset.height <= 0) {
      return { error: 'Choose a supported JPG or PNG product picture.' };
    }
    const format = asset.mimeType === 'image/png' || /\.png$/i.test(asset.fileName || '')
      ? SaveFormat.PNG : SaveFormat.JPEG;
    for (const maxSide of [960, 640, 480]) {
      const context = ImageManipulator.manipulate(asset.uri);
      let image;
      try {
        context.resize(asset.width >= asset.height
          ? { width: Math.min(asset.width, maxSide) }
          : { height: Math.min(asset.height, maxSide) });
        image = await context.renderAsync();
        const saved = await image.saveAsync({ format, compress: 0.75, base64: true });
        if (!saved.base64) return { error: 'Could not read that picture. Try another JPG or PNG.' };
        const dataUri = `data:image/${format};base64,${saved.base64}`;
        // Leave room for product metadata in Android's SQLite row buffer.
        if (dataUri.length <= 1024 * 1024) return { ok: true, dataUri };
      } finally {
        if (image) image.release();
        context.release();
      }
    }
    return { error: 'That picture is too large. Choose a smaller JPG or PNG.' };
  } catch (error) {
    return { error: (error && error.message) || 'Could not prepare that picture. Try another image.' };
  }
}
