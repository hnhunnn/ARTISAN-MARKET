import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// --- [MỚI] Import hàm trừ kho từ backend service ---
// Đảm bảo bạn đã thêm hàm này vào productService.ts như bước trước
import { reduceStockAfterPurchase } from '../../backend/productService';

const BackIcon = () => <Text style={styles.backIcon}>{'<'}</Text>;
const IconText = ({ icon }: { icon: string }) => (
  <Text style={styles.iconText}>{icon}</Text>
);

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const { cartItems, getTotalPrice, clearCart } = useCart();
  const totalAmount = getTotalPrice();

  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const handleGoBack = () => {
    navigation.goBack();
  };

  // --- HÀM TẠO ORDER LOCAL ---
  const createOrderLocal = async (orderData: {
    userId: string;
    customerName: string;
    phone: string;
    address: string;
    totalPrice: number;
    items: any[];
  }) => {
    try {
      await firestore()
        .collection('orders')
        .add({
          ...orderData,
          status: 'pending',
          createdAt: firestore.FieldValue.serverTimestamp(),
          paymentMethod: paymentMethod,
        });
      return true;
    } catch (err) {
      console.error('[ERROR] Lỗi tạo order local:', err);
      return false;
    }
  };

  // --- HÀM 1: GỌI API LẤY KEY STRIPE ---
  const fetchPaymentSheetParams = async () => {
    try {
      // ⚠️ IP: 10.0.2.2 cho máy ảo Android, IP LAN cho máy thật
      const API_URL = 'http://10.0.2.2:3000/payment-sheet';

      console.log(`[STEP 4] Đang gọi API tới: ${API_URL}`);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[ERROR API]', text);
        Alert.alert('Lỗi Server', text);
        return null;
      }

      const { paymentIntent, ephemeralKey, customer } = await response.json();
      return { paymentIntent, ephemeralKey, customer };
    } catch (error) {
      console.error('[CRITICAL ERROR]', error);
      Alert.alert('Lỗi kết nối', 'Không thể gọi Server thanh toán.');
      return null;
    }
  };

  // --- HÀM 2: LƯU ĐƠN HÀNG VÀO FIREBASE ---
  const saveOrderToFirebase = async () => {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      Alert.alert('Lỗi đăng nhập', 'Bạn chưa đăng nhập.');
      return false;
    }

    const orderData = {
      userId: currentUser.uid,
      customerName: shippingName,
      phone: shippingPhone,
      address: shippingAddress,
      totalPrice: totalAmount,
      items: cartItems,
    };

    const success = await createOrderLocal(orderData);
    if (!success) {
      Alert.alert('Lỗi', 'Không thể lưu đơn hàng vào hệ thống.');
      return false;
    }
    return true;
  };

  // --- HÀM 3: XỬ LÝ THANH TOÁN STRIPE ---
  const onCheckoutStripe = async () => {
    console.log('[STEP 3] Bắt đầu Stripe...');
    setLoading(true);

    await new Promise(resolve => setTimeout(() => resolve(true), 100));

    // 1. Lấy Key
    const data = await fetchPaymentSheetParams();
    if (!data) {
      setLoading(false);
      return;
    }

    // 2. Init Stripe
    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Artisan Market',
      customerId: data.customer,
      customerEphemeralKeySecret: data.ephemeralKey,
      paymentIntentClientSecret: data.paymentIntent,
      allowsDelayedPaymentMethods: true,
      customFlow: false,
      returnURL: 'artisanmarket://stripe-redirect',
      defaultBillingDetails: {
        name: shippingName || 'Khách hàng',
        phone: shippingPhone,
        address: { line1: shippingAddress },
      },
    });

    if (error) {
      setLoading(false);
      Alert.alert(`Lỗi khởi tạo`, error.message);
      return;
    }

    // 3. Hiện bảng thanh toán
    const { error: paymentError } = await presentPaymentSheet();

    if (paymentError) {
      setLoading(false);
      if (paymentError.code !== 'Canceled') {
        Alert.alert('Thanh toán lỗi', paymentError.message);
      }
    } else {
      console.log('Thanh toán thành công. Đang lưu đơn...');

      // 4. Lưu đơn hàng
      const saved = await saveOrderToFirebase();

      if (saved) {
        // 5. [MỚI] Trừ kho sau khi lưu đơn thành công
        await reduceStockAfterPurchase(cartItems);

        setLoading(false);
        Alert.alert('Thanh toán thành công!', 'Đơn hàng đã được lưu.', [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              navigation.navigate('Home');
            },
          },
        ]);
      } else {
        setLoading(false);
      }
    }
  };

  // --- HÀM 4: NÚT BẤM CHÍNH (XỬ LÝ CHUNG) ---
  const handlePlaceOrder = async () => {
    // Validate
    if (
      !shippingName.trim() ||
      !shippingPhone.trim() ||
      !shippingAddress.trim()
    ) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập đầy đủ thông tin giao hàng.',
      );
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm sản phẩm.');
      return;
    }

    // Phân luồng
    if (paymentMethod === 'stripe') {
      await onCheckoutStripe();
    } else {
      // --- XỬ LÝ COD ---
      console.log('Xử lý COD...');
      setLoading(true);

      // 1. Lưu đơn hàng
      const saved = await saveOrderToFirebase();

      if (saved) {
        // 2. [MỚI] Trừ kho ngay lập tức
        await reduceStockAfterPurchase(cartItems);

        setLoading(false);
        Alert.alert(
          'Đặt hàng thành công!',
          `Tổng: ${totalAmount.toLocaleString(
            'vi-VN',
          )} đ\nPhương thức: Tiền mặt (COD).`,
          [
            {
              text: 'OK',
              onPress: () => {
                clearCart();
                navigation.navigate('Home');
              },
            },
          ],
        );
      } else {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Thanh Toán</Text>
            <Text style={styles.headerSubtitle}>Hoàn tất đơn hàng của bạn</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Card Đơn Hàng */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconText icon="📄" />
                <Text style={styles.cardTitle}>
                  Đơn Hàng ({cartItems.length})
                </Text>
              </View>
              {cartItems.map(item => (
                <View key={item.id} style={styles.orderItem}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.orderItemImage}
                  />
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemQuantity}>
                      x {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              ))}
              <View style={styles.orderTotal}>
                <Text style={styles.orderTotalText}>Tổng:</Text>
                <Text style={styles.orderTotalPrice}>
                  {totalAmount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Card Thông Tin */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconText icon="🚚" />
                <Text style={styles.cardTitle}>Giao Hàng</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Họ tên *"
                value={shippingName}
                onChangeText={setShippingName}
              />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại *"
                keyboardType="phone-pad"
                value={shippingPhone}
                onChangeText={setShippingPhone}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Địa chỉ *"
                multiline
                value={shippingAddress}
                onChangeText={setShippingAddress}
              />
            </View>

            {/* Card Thanh Toán */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconText icon="💳" />
                <Text style={styles.cardTitle}>Thanh Toán</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cod' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('cod')}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'cod' && (
                    <View style={styles.radioSelected} />
                  )}
                </View>
                <Text style={styles.paymentMethodTitle}>COD (Tiền mặt)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'stripe' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('stripe')}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'stripe' && (
                    <View style={styles.radioSelected} />
                  )}
                </View>
                <Text style={styles.paymentMethodTitle}>
                  Thẻ Quốc Tế (Visa/Master)
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.fixedPlaceOrderButton,
              (cartItems.length === 0 || loading) && styles.disabledButton,
            ]}
            onPress={handlePlaceOrder}
            disabled={cartItems.length === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.placeOrderButtonText}>
                {paymentMethod === 'stripe' ? 'THANH TOÁN' : 'ĐẶT HÀNG'} •{' '}
                {totalAmount.toLocaleString('vi-VN')} đ
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    backgroundColor: '#DB4437',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: { marginRight: 15 },
  backIcon: { fontSize: 24, color: 'white', fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 13, color: '#E0BFEA' },
  scrollContent: { padding: 15 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconText: { fontSize: 20, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  orderItemDetails: { flex: 1 },
  orderItemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  orderItemQuantity: { fontSize: 13, color: '#777' },
  orderItemPrice: { fontSize: 14, fontWeight: 'bold', color: '#DB4437' },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderTotalText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderTotalPrice: { fontSize: 18, fontWeight: 'bold', color: '#DB4437' },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  multilineInput: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentOptionSelected: { borderColor: '#DB4437', backgroundColor: '#F3E5F5' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DB4437',
  },
  paymentMethodTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  fixedPlaceOrderButton: {
    backgroundColor: '#DB4437',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  disabledButton: { backgroundColor: '#BDBDBD', elevation: 0 },
  placeOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default CheckoutScreen;
