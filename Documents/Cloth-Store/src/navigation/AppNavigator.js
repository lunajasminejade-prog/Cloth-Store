// App navigation: tab routes (Home/Shop/Cart/Profile) plus the
// full shopping flow (Details, Wishlist, Checkout, Confirmation,
// Orders, Order Details) and store-tools screens (Settings, Products,
// Inventory, Reports). Cart, Filter, Confirm, and Product Form are
// Figma-style overlays so the underlying screen stays visible.
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import BottomNav from '../components/BottomNav';
import CartSheet from '../components/CartSheet';
import ConfirmModal from '../components/ConfirmModal';
import FilterSheet from '../components/FilterSheet';
import ProductFormModal from '../components/ProductFormModal';
import { useShop } from '../store/ShopContext';
import { FONT, INK, WHITE } from '../theme';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeScreen from '../screens/HomeScreen';
import InventoryScreen from '../screens/InventoryScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import { OrderDetailsScreen } from '../screens/OrdersScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShopScreen from '../screens/ShopScreen';
import WishlistScreen from '../screens/WishlistScreen';

export default function AppNavigator() {
  const shop = useShop();
  const { route, maxW } = shop;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={[styles.center, { width: '100%' }]}>
        <View style={{ width: maxW, flex: 1 }}>
          {route === 'home' ? (
            <HomeScreen />
          ) : route === 'shop' ? (
            <ShopScreen />
          ) : route === 'details' ? (
            <ProductDetailsScreen key={shop.selectedId} />
          ) : route === 'wishlist' ? (
            <WishlistScreen />
          ) : route === 'checkout' ? (
            <CheckoutScreen />
          ) : route === 'confirmation' ? (
            <OrderConfirmationScreen />
          ) : route === 'orders' ? (
            <OrdersScreen />
          ) : route === 'orderDetails' ? (
            <OrderDetailsScreen />
          ) : route === 'settings' ? (
            <SettingsScreen />
          ) : route === 'products' ? (
            <ProductManagementScreen />
          ) : route === 'inventory' ? (
            <InventoryScreen />
          ) : route === 'reports' ? (
            <ReportsScreen />
          ) : (
            <ProfileScreen />
          )}
          <BottomNav active={shop.activeTab} onGo={shop.goTab} cartCount={shop.cartCount} />
          {shop.toast ? (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{shop.toast}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <FilterSheet />
      <CartSheet />
      <ConfirmModal />
      <ProductFormModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  center: { flex: 1, alignItems: 'center', backgroundColor: WHITE },
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 96,
    backgroundColor: INK, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  toastText: { color: WHITE, fontSize: 14, fontWeight: '500', textAlign: 'center', fontFamily: FONT },
});
