import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext'; // <--- [MỚI] Import Wishlist

// Import các hàm từ service
import {
  Product,
  fetchProductsFromFirestore,
  getUserInfo,
  seedDatabase,
  updateAllProductsQuantity,
} from '../../backend/productService';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'all', name: 'Tất cả', icon: '🔥' },
  { id: 'ceramics', name: 'Gốm sứ', icon: '💡' },
  { id: 'weaving', name: 'Đan lát', icon: '🧺' },
  { id: 'painting', name: 'Tranh vẽ', icon: '🖼️' },
  { id: 'jewelry', name: 'Trang sức', icon: '💎' },
];

const CategoryCard: React.FC<{
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  onPressCategory: (id: string) => void;
}> = ({ id, name, icon, isActive, onPressCategory }) => (
  <TouchableOpacity
    style={[styles.categoryCard, isActive && styles.categoryCardActive]}
    onPress={() => onPressCategory(id)}
  >
    <Text style={styles.categoryIcon}>{icon}</Text>
    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
      {name}
    </Text>
  </TouchableOpacity>
);

// --- [CẬP NHẬT] ProductCard: Thêm nút Tim ---
const ProductCard: React.FC<{
  product: Product;
  onAddToCart: (item: Product) => void;
}> = ({ product, onAddToCart }) => {
  const navigation = useNavigation();

  // 1. Sử dụng Hook Wishlist để kiểm tra trạng thái và xử lý bấm tim
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isLiked = isInWishlist(product.id);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => (navigation as any).navigate('ProductDetail', { product })}
    >
      {/* Wrapper chứa ảnh và nút tim */}
      <View>
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />

        {/* 2. Nút Trái Tim nằm trên góc ảnh */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => toggleWishlist(product)} // Lưu vào Firebase qua Context
        >
          <Text style={{ fontSize: 16, color: isLiked ? 'red' : 'black' }}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          {product.price.toLocaleString('vi-VN')} đ
        </Text>

        <View style={styles.ratingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFD700', marginRight: 4 }}>⭐</Text>
            <Text style={styles.productRatingText}>
              {product.rating.toFixed(1)}
            </Text>
          </View>

          {/* Hiển thị số lượng tồn kho */}
          <Text style={{ fontSize: 10, color: '#999', marginLeft: 10 }}>
            Kho: {product.quantity ?? 0}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onAddToCart(product)}
        >
          <Text style={styles.addButtonText}>+ Thêm vào giỏ</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen: React.FC = () => {
  const [userName, setUserName] = useState('Khách');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { addToCart } = useCart();
  const navigation = useNavigation();

  // Lấy thông tin User thật
  const fetchUser = async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      const info: any = await getUserInfo(currentUser.uid);
      if (info && info.hoTen) {
        setUserName(info.hoTen);
      } else {
        setUserName(currentUser.email || 'Người dùng');
      }
    }
  };

  // Lấy sản phẩm từ Firebase
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProducts = await fetchProductsFromFirestore(activeCategory);
      setProducts(fetchedProducts);
    } catch (e) {
      console.error('Lỗi tải sản phẩm:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  // Load lại khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchUser();
      loadProducts();
    }, [loadProducts]),
  );

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng xuất.');
    }
  };

  // Hàm nạp dữ liệu mẫu & Cập nhật kho
  const handleDataAction = () => {
    Alert.alert('Quản lý dữ liệu', 'Chọn hành động bạn muốn:', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Reset Data Mẫu',
        onPress: async () => {
          setIsLoading(true);
          await seedDatabase();
          await loadProducts();
          setIsLoading(false);
          Alert.alert('Thành công', 'Đã tạo lại dữ liệu mẫu');
        },
      },
      {
        text: 'Cập nhật Kho (50)',
        onPress: async () => {
          setIsLoading(true);
          const success = await updateAllProductsQuantity(50);
          if (success) {
            await loadProducts();
            Alert.alert('Thành công', 'Đã cập nhật kho = 50 cho tất cả sp');
          } else {
            Alert.alert('Lỗi', 'Cập nhật thất bại');
          }
          setIsLoading(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.userInfoRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.greetingText}>Xin chào,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          <View style={styles.headerIcons}>
            {/* Nút quản lý Data */}
            <TouchableOpacity
              onPress={handleDataAction}
              style={{
                marginRight: 10,
                padding: 5,
                backgroundColor: 'white',
                borderRadius: 5,
              }}
            >
              <Text
                style={{ fontWeight: 'bold', color: '#FF6F00', fontSize: 10 }}
              >
                ⚙ DATA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => console.log('Thông báo')}
            >
              <Text style={styles.iconText}>🔔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => (navigation as any).navigate('Cart')}
            >
              <Text style={styles.iconText}>🛒</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
              <Text style={styles.iconText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.mainTitle}>
          Chào mừng đến với thế giới thủ công
        </Text>
        <Text style={styles.subTitle}>
          Khám phá những tác phẩm nghệ thuật độc đáo
        </Text>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor="#C0C0C0"
          />
          <TouchableOpacity style={styles.searchIcon}>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentScrollView}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContainer}
        >
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={cat.icon}
              isActive={cat.id === activeCategory}
              onPressCategory={setActiveCategory}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Sản Phẩm{' '}
            {categories.find(c => c.id === activeCategory)?.name || 'Nổi Bật'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#FF6F00"
            style={{ marginTop: 20 }}
          />
        ) : products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={({ item }) => (
              <ProductCard product={item} onAddToCart={addToCart} />
            )}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.productListContainer}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Image
              source={require('../../assets/logo_1.png')}
              style={styles.emptyStateImage}
            />
            <Text style={styles.emptyStateTitle}>Chưa có sản phẩm nào</Text>
            <Text style={styles.emptyStateSubtitle}>
              Bấm nút "⚙ DATA" ở góc trên để tạo dữ liệu
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabTextActive}>Trang chủ</Text>
        </TouchableOpacity>

        {/* Link sang màn hình Yêu thích */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => (navigation as any).navigate('Wishlist')}
        >
          <Text style={styles.tabIcon}>❤️</Text>
          <Text style={styles.tabText}>Yêu thích</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => (navigation as any).navigate('Cart')}
        >
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={styles.tabText}>Giỏ hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => (navigation as any).navigate('Profile')} // <--- SỬA DÒNG NÀY
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabText}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  headerContainer: {
    backgroundColor: '#FF6F00',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 80,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: { fontSize: 20, color: 'white', fontWeight: 'bold' },
  greetingText: { color: 'white', fontSize: 14 },
  userName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerIcons: {
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    alignItems: 'center',
  },
  iconButton: { marginLeft: 10, padding: 5 },
  iconText: { fontSize: 22, color: 'white' },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  subTitle: { fontSize: 14, color: '#FFE0B2', marginBottom: 15 },
  searchBox: {
    position: 'absolute',
    bottom: -25,
    width: width - 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  searchIcon: { padding: 5 },
  searchIconText: { fontSize: 18, color: '#FF6F00' },
  contentScrollView: { flex: 1, paddingTop: 40 },
  categoryScrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCardActive: { backgroundColor: '#FF6F00', borderColor: '#FF6F00' },
  categoryIcon: { fontSize: 18, marginRight: 5 },
  categoryText: { fontSize: 16, color: '#333', fontWeight: '500' },
  categoryTextActive: { color: 'white', fontWeight: 'bold' },
  sectionHeader: { paddingHorizontal: 20, marginTop: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  emptyStateContainer: { alignItems: 'center', padding: 30, marginTop: 50 },
  emptyStateImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginBottom: 30,
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
  tabItem: { alignItems: 'center', padding: 5 },
  tabIcon: { fontSize: 24 },
  tabText: { fontSize: 12, color: '#777' },
  tabTextActive: { fontSize: 12, color: '#FF6F00', fontWeight: 'bold' },
  productListContainer: { paddingHorizontal: 10 },
  row: { justifyContent: 'space-between', marginBottom: 10 },

  productCard: {
    width: width / 2 - 30,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    resizeMode: 'cover',
  },
  // [STYLE MỚI] Nút tim trên sản phẩm
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', // Nền trắng mờ
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3, // Đổ bóng nhẹ
  },
  productInfo: { padding: 10 },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    minHeight: 40,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productRating: { flexDirection: 'row', alignItems: 'center' },
  productRatingText: { fontSize: 14, color: '#777' },
  loadingText: {
    textAlign: 'center',
    padding: 30,
    fontSize: 16,
    color: '#777',
  },
  addButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HomeScreen;
