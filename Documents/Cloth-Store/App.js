// Cloth Store entry point: provides shared shop state,
// then renders the app navigator (all screens reachable).
import { ShopProvider } from './src/store/ShopContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ShopProvider>
      <AppNavigator />
    </ShopProvider>
  );
}
