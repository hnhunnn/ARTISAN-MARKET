import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native'; // Import thêm để loading đẹp hơn
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. Import Stripe Provider
import { StripeProvider } from '@stripe/stripe-react-native';

// 2. Import các màn hình
import LoginScreen from './src/frontend/screens/LoginScreen';
import RegisterScreen from './src/frontend/screens/RegisterScreen';
import HomeScreen from './src/frontend/screens/HomeScreen';
import ProductDetailScreen from './src/frontend/screens/ProductDetailScreen';
import WishlistScreen from './src/frontend/screens/WishlistScreen';
import CartScreen from './src/frontend/screens/CartScreen';
import CheckoutScreen from './src/frontend/screens/CheckoutScreen';
import ProfileScreen from './src/frontend/screens/ProfileScreen';

// --- [MỚI] Import màn hình Lịch sử & Chi tiết đơn hàng ---
import OrderHistoryScreen from './src/frontend/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/frontend/screens/OrderDetailScreen';

// 3. Import Context
import { WishlistProvider } from './src/frontend/context/WishlistContext';
import { CartProvider } from './src/frontend/context/CartContext';

const Stack = createNativeStackNavigator();

// --- Stack cho người chưa đăng nhập (Khách) ---
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// --- Stack cho người đã đăng nhập (User) ---
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />

      {/* --- [MỚI] Đăng ký màn hình vào Stack để điều hướng --- */}
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  // Theo dõi trạng thái đăng nhập từ Firebase
  function onAuthStateChanged(userState: FirebaseAuthTypes.User | null) {
    setUser(userState);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // cleanup subscription
  }, []);

  // Hiển thị màn hình loading khi đang kiểm tra đăng nhập (tránh màn hình trắng)
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6F00" />
      </View>
    );
  }

  return (
    /* 👇 Thay Public Key của bạn vào đây */
    <StripeProvider
      publishableKey="pk_test_51SWWVQABAIB0de0SDtX3qE5I4ro09ydMw41fvDxMcxBJrYrSC1R6A3CQyF0ntVFEBqJVDWsDLtCmEQlA6kkOoo1r00yQERKml3"
      merchantIdentifier="merchant.com.artisan_market"
    >
      {/* ✅ CartProvider bao ngoài Navigation để Context luôn sống */}
      <CartProvider>
        <WishlistProvider>
          <NavigationContainer>
            {/* Phân luồng: Có user -> Vào App, Chưa có -> Vào trang Login */}
            {user ? <AppStack /> : <AuthStack />}
          </NavigationContainer>
        </WishlistProvider>
      </CartProvider>
    </StripeProvider>
  );
};

export default App;
