import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Image,
  Alert,
} from 'react-native';

import { useCart } from '../context/CartContext';
import { RootStackParamList } from '../../navigation/types';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width } = Dimensions.get('window');

// Component Card Sản phẩm trong Giỏ hàng
const CartItemCard: React.FC<any> = ({ item }) => {
  // Lấy toggleItemSelection từ Context
  const { addToCart, removeFromCart, decreaseQuantity, toggleItemSelection } =
    useCart();

  // LOGIC GIẢM GIÁ
  const discount = item.discount || 0;
  const hasDiscount = discount > 0;
  const finalPriceUnit = hasDiscount
    ? item.price * (1 - discount / 100)
    : item.price;

  // Tính tổng giá cho item này
  const totalItemPrice = finalPriceUnit * item.quantity;
  const formattedTotalItemPrice = totalItemPrice.toLocaleString('vi-VN');

  const handleQuantityChange = (delta: number) => {
    if (delta > 0) {
      addToCart(item);
    } else {
      decreaseQuantity(item.id);
    }
  };

  const handleRemoveItem = () => {
    removeFromCart(item.id);
  };

  return (
    <View style={styles.itemCard}>
      {/* KHU VỰC ẢNH VÀ CHECKBOX */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />

        {/* CHECKBOX CHỌN MUA (ĐẶT TRÊN ẢNH) */}
        <TouchableOpacity
          style={styles.checkboxPosition}
          onPress={() => toggleItemSelection(item.id)}
        >
          <View
            style={[
              styles.checkbox,
              item.isSelected && styles.checkboxSelected,
            ]}
          >
            {item.isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>

        {/* HIỂN THỊ GIÁ GỐC VÀ GIÁ GIẢM TRÊN CÙNG MỘT HÀNG */}
        <View style={styles.inlinePriceContainer}>
          {hasDiscount && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.originalPriceText}>
                {item.price.toLocaleString('vi-VN')} đ
              </Text>
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </View>
          )}
          {/* Giá cuối cùng/giá thường */}
          <Text style={hasDiscount ? styles.finalPriceText : styles.itemPrice}>
            {finalPriceUnit.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        {/* HIỂN THỊ TỔNG CỘNG CHO ITEM NÀY */}
        <Text style={styles.totalItemPriceText}>
          Tổng: {formattedTotalItemPrice} đ
        </Text>
      </View>

      {/* HÀNG BUTTONS TĂNG/GIẢM VÀ XÓA */}
      <View style={styles.itemActions}>
        {/* NÚT XÓA (VỊ TRÍ MỚI: GÓC TRÊN BÊN PHẢI) */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveItem}
        >
          {/* Dấu X đơn giản thay cho icon */}
          <Text style={styles.removeText}>X</Text>
        </TouchableOpacity>

        <View style={styles.quantityControl}>
          {/* Nút Giảm số lượng */}
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(-1)}
            disabled={item.quantity <= 1}
          >
            <Text style={styles.quantityText}>-</Text>
          </TouchableOpacity>

          {/* Số lượng */}
          <Text style={styles.quantityDisplay}>{item.quantity}</Text>

          {/* Nút Tăng số lượng */}
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(1)}
          >
            <Text style={styles.quantityText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Component Giỏ hàng chính
const CartScreen: React.FC = () => {
  const { cartItems, getTotalPrice } = useCart();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const selectedItems = cartItems.filter(item => item.isSelected);

  const selectedTotalAmount = getTotalPrice(selectedItems);
  const formattedSelectedTotal = selectedTotalAmount.toLocaleString('vi-VN');

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert(
        'Thông báo',
        'Vui lòng chọn ít nhất một sản phẩm để thanh toán.',
      );
      return;
    }

    navigation.navigate('Checkout' as never, {
      cartItems: selectedItems, // CHỈ CHUYỂN SẢN PHẨM ĐÃ CHỌN
      totalAmount: selectedTotalAmount,
    });
  };

  const handleToggleSelectAll = () => {
    const allSelected = cartItems.every(item => item.isSelected);
    console.log(
      'Chức năng chọn/bỏ chọn tất cả chưa được tích hợp vào CartContext.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Màu Cam Đậm */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ Hàng</Text>
        </View>

        {/* NÚT CHỌN TẤT CẢ (UX improvement) */}
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleToggleSelectAll}
          >
            <View
              style={[
                styles.checkbox,
                cartItems.every(item => item.isSelected) &&
                  styles.checkboxSelected,
              ]}
            >
              {cartItems.every(item => item.isSelected) && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </View>
            <Text style={styles.selectAllText}>
              Chọn tất cả ({selectedItems.length}/{cartItems.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Nội dung Giỏ hàng */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {cartItems.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
              Giỏ hàng đang trống
            </Text>
          ) : (
            cartItems.map(item => <CartItemCard key={item.id} item={item} />)
          )}

          {/* Tổng kết tạm thời */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              Tổng tiền tạm tính (Đã chọn):
            </Text>
            <Text style={styles.totalPriceText}>
              {formattedSelectedTotal} đ
            </Text>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* NÚT MUA NGAY (CỐ ĐỊNH) */}
        <TouchableOpacity
          style={styles.fixedCheckoutButton}
          onPress={handleCheckout}
          disabled={selectedItems.length === 0} // Chỉ bật khi có sản phẩm được chọn
        >
          <Text style={styles.checkoutButtonText}>
            MUA NGAY ({selectedItems.length})
          </Text>
        </TouchableOpacity>

        {/* Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Home' as never)}
          >
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={styles.tabText}>Trang chủ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabIcon}>🛒</Text>
            <Text style={styles.tabTextActive}>Giỏ hàng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6F00',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    backgroundColor: '#FF6F00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    paddingRight: 15,
  },
  backIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },

  // NÚT CHỌN TẤT CẢ
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6F00',
  },
  selectAllText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative', // Quan trọng để nút xóa có thể đặt absolute
  },

  // KHU VỰC ẢNH VÀ CHECKBOX
  imageWrapper: {
    position: 'relative',
    marginRight: 15,
  },
  checkboxPosition: {
    position: 'absolute',
    top: -5,
    left: -5,
    zIndex: 5,
    padding: 5,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },

  // STYLES CHECKBOX
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#FF6F00',
    borderColor: '#FF6F00',
  },
  checkMark: {
    color: 'white',
    fontSize: 16,
    lineHeight: 18,
  },

  itemInfo: {
    flex: 1,
    // Loại bỏ margin vì đã xử lý ở itemActions
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },

  // ---- STYLE CHO GIÁ (CÙNG HÀNG) ----
  inlinePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 5,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountTag: {
    backgroundColor: '#FFF0F1',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 10,
  },
  discountText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold' },
  finalPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  totalItemPriceText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  // -------------------------

  itemActions: {
    // Khu vực chứa nút xóa và nút tăng/giảm
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80, // Chiều cao bằng chiều cao ảnh
    position: 'absolute', // Đặt absolute để điều khiển vị trí nút xóa
    right: 15,
    top: 15,
  },

  // [CẬP NHẬT] NÚT XÓA: GỌN GÀNG VÀ HỢP LÝ HƠN
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEBEE', // Nền nhẹ
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5, // Khoảng cách với control quantity
  },
  removeText: {
    fontSize: 16, // Kích thước icon X
    fontWeight: 'bold',
    color: '#D32F2F', // Màu đỏ nổi bật
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto', // Đẩy xuống cuối itemActions
  },
  quantityButton: {
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  quantityDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },

  summaryBox: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryText: {
    fontSize: 18,
    color: '#333',
  },
  totalPriceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  fixedCheckoutButton: {
    backgroundColor: '#FF6F00',
    width: '90%',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 10,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    padding: 5,
  },
  tabIcon: {
    fontSize: 24,
  },
  tabText: {
    fontSize: 12,
    color: '#777',
  },
  tabTextActive: {
    fontSize: 12,
    color: '#FF6F00',
    fontWeight: 'bold',
  },
});

export default CartScreen;
