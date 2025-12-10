import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated, // IMPORT QUAN TRỌNG CHO HIỆU ỨNG
  Easing, // QUAN TRỌNG CHO HIỆU ỨNG
} from 'react-native';

// Import thư viện chọn ảnh
import {
  launchImageLibrary,
  ImagePickerResponse,
} from 'react-native-image-picker';

import auth from '@react-native-firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

// Import các hàm từ service
import {
  Product,
  fetchProductsFromFirestore,
  getUserInfo,
  seedDatabase,
  updateAllProductsQuantity,
  fetchProductsByIds,
} from '../../backend/productService';

const { width } = Dimensions.get('window');

// Địa chỉ API Tìm kiếm Hình ảnh của bạn (Chạy trên máy tính)
const VISUAL_SEARCH_API_URL = 'http://10.0.2.2:8000/search/image';

// Kích thước cố định cho khu vực quét ảnh
const SCAN_AREA_SIZE = width * 0.45;

// =======================================================
// [COMPONENT MỚI] KHU VỰC HIỂN THỊ ẢNH VÀ HIỆU ỨNG QUÉT
// =======================================================
const VisualSearchScanArea: React.FC<{ uri: string; isScanning: boolean }> = ({
  uri,
  isScanning,
}) => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  const startScanAnimation = useCallback(() => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000, // Thời gian quét
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();
  }, [scanAnim]);

  useEffect(() => {
    if (isScanning) {
      startScanAnimation();
    } else {
      scanAnim.stopAnimation();
    }
  }, [isScanning, startScanAnimation]);

  const scanLinePosition = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'], // Di chuyển từ trái sang phải
  });

  return (
    <View style={styles.scanAreaContainer}>
      <Image source={{ uri }} style={styles.scanImage} />

      {/* Hiệu ứng Sóng quét */}
      {isScanning && (
        <View style={styles.scanOverlay}>
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{ translateX: scanLinePosition }],
              },
            ]}
          />
        </View>
      )}

      {/* Vòng tròn loading chính giữa */}
      {isScanning && (
        <ActivityIndicator
          size="large"
          color="#FF6F00"
          style={styles.scanActivityIndicator}
        />
      )}
    </View>
  );
};

// =======================================================
// [COMPONENT CHÍNH] HOMESCREEN
// =======================================================

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

const ProductCard: React.FC<{
  product: Product;
  onAddToCart: (item: Product) => void;
}> = ({ product, onAddToCart }) => {
  const navigation = useNavigation();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isLiked = isInWishlist(product.id);

  // LOGIC GIẢM GIÁ
  const discount = product.discount || 0;
  const hasDiscount = discount > 0;
  const finalPrice = hasDiscount
    ? product.price * (1 - discount / 100)
    : product.price;

  // Hàm xử lý thêm vào giỏ hàng
  const handleAddToCartPress = () => {
    onAddToCart(product);
    Alert.alert('✅ Thành công', `Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => (navigation as any).navigate('ProductDetail', { product })}
    >
      <View>
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />

        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => toggleWishlist(product)}
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

        {/* HIỂN THỊ GIÁ VÀ GIẢM GIÁ */}
        {hasDiscount ? (
          <View style={{ marginBottom: 5 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 2,
              }}
            >
              <Text style={styles.originalPriceText}>
                {product.price.toLocaleString('vi-VN')} đ
              </Text>
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </View>
            <Text style={styles.finalPriceText}>
              {finalPrice.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        ) : (
          <Text style={styles.productPrice}>
            {product.price.toLocaleString('vi-VN')} đ
          </Text>
        )}

        <View style={styles.ratingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFD700', marginRight: 4 }}>⭐</Text>
            <Text style={styles.productRatingText}>
              {product.rating ? product.rating.toFixed(1) : '5.0'}
            </Text>
          </View>

          <Text style={{ fontSize: 10, color: '#999', marginLeft: 10 }}>
            Kho: {product.quantity ?? 0}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCartPress}
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

  // State cho kết quả tìm kiếm bằng hình ảnh
  const [visualSearchResults, setVisualSearchResults] = useState<Product[]>([]);
  const [isVisualSearchMode, setIsVisualSearchMode] = useState(false);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  // [MỚI] State lưu URI của ảnh đang được quét
  const [imageUriToScan, setImageUriToScan] = useState<string | null>(null);

  // State cho tìm kiếm bằng tên
  const [searchText, setSearchText] = useState('');

  const { addToCart } = useCart();
  const navigation = useNavigation();

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

  // [CẬP NHẬT] Tải và lọc sản phẩm (Thêm searchText)
  const loadProducts = useCallback(async () => {
    if (isVisualSearchMode) {
      return;
    }

    setIsLoading(true);
    try {
      const allProducts = await fetchProductsFromFirestore('all');

      let filteredProducts = allProducts;

      if (activeCategory !== 'all') {
        filteredProducts = filteredProducts.filter(
          p => p.category === activeCategory,
        );
      }

      if (searchText.trim() !== '') {
        const lowerCaseSearch = searchText.trim().toLowerCase();
        filteredProducts = filteredProducts.filter(
          p =>
            p.name.toLowerCase().includes(lowerCaseSearch) ||
            (p.description &&
              p.description.toLowerCase().includes(lowerCaseSearch)),
        );
      }

      setProducts(filteredProducts);
      setVisualSearchResults([]);
    } catch (e) {
      console.error('Lỗi tải sản phẩm:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, isVisualSearchMode, searchText]);

  // Load lại khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchUser();
      loadProducts();
    }, [loadProducts]),
  );

  // [MỚI] Hàm xử lý khi nhấn Enter (hoặc nhấn nút tìm kiếm)
  const handleSearch = () => {
    if (isVisualSearchMode) {
      setIsVisualSearchMode(false);
      setVisualSearchResults([]);
    }
    loadProducts();
  };

  // [CẬP NHẬT] Hàm chọn ảnh và gọi API Tìm kiếm (Thêm hiển thị ảnh)
  // [CẬP NHẬT] Hàm chọn ảnh và gọi API Tìm kiếm (Đã bỏ Alert quá trình)
  const handleImagePickAndSearch = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 1 },
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
          return;
        }
        if (
          response.errorCode ||
          !response.assets ||
          response.assets.length === 0
        ) {
          Alert.alert('Lỗi', 'Không thể chọn ảnh.');
          return;
        }

        const asset = response.assets[0];
        const uri = asset.uri;
        const type = asset.type || 'image/jpeg';
        const name = asset.fileName || 'search_image.jpg';

        if (!uri) {
          Alert.alert('Lỗi', 'Không tìm thấy đường dẫn ảnh.');
          return;
        }

        // --- BẮT ĐẦU TRẠNG THÁI AI (Không có Alert) ---
        setImageUriToScan(uri); // LƯU ẢNH ĐỂ HIỂN THỊ QUÉT
        setIsSearchingImage(true);
        setIsVisualSearchMode(true);
        setProducts([]);
        setSearchText('');

        // ĐÃ BỎ Alert.alert('⌛ AI Đang Phân Tích', '...');
        // ------------------------------------------------

        try {
          const formData = new FormData();
          formData.append('file', { uri, type, name } as any);

          // LOG KIỂM TRA
          console.log(
            '--- 🔎 RN LOG: Bắt đầu gửi POST request tới FastAPI ---',
          );

          const apiResponse = await fetch(`${VISUAL_SEARCH_API_URL}?k=5`, {
            method: 'POST',
            body: formData,
          });

          console.log(
            `--- 🔎 RN LOG: Server trả về Status: ${apiResponse.status} ---`,
          );

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('❌ RN LOG: Lỗi Server Response:', errorText);
            Alert.alert(
              'Lỗi AI (5xx)',
              `Server AI gặp sự cố. Vui lòng kiểm tra log FastAPI. (Status: ${apiResponse.status})`,
            );
            throw new Error(`Server AI Error: ${apiResponse.status}`);
          }

          const data = await apiResponse.json();

          const foundProductIds = data.results.map((r: any) => r.product_id);
          console.log('✅ RN LOG: IDs từ AI:', foundProductIds);

          if (foundProductIds.length > 0) {
            setIsLoading(true); // Bật tải dữ liệu chi tiết

            const detailedProducts = await fetchProductsByIds(foundProductIds);

            setIsLoading(false); // Kết thúc tải dữ liệu

            console.log(
              '✅ RN LOG: Sản phẩm chi tiết từ Firestore:',
              detailedProducts,
            );

            if (detailedProducts.length > 0) {
              setVisualSearchResults(detailedProducts);
            } else {
              setVisualSearchResults([]);
              console.log(
                '❌ RN LOG: AI tìm thấy IDs, nhưng Firestore không có dữ liệu cho các IDs này.',
              );
              Alert.alert(
                '❌ AI Hoàn thành',
                'AI đã tìm ra IDs nhưng không khớp dữ liệu Firestore. Vui lòng kiểm tra Data.',
              );
            }
          } else {
            setVisualSearchResults([]);
            console.log('❌ RN LOG: AI không tìm thấy bất kỳ Product IDs nào.');
            Alert.alert(
              '❌ AI Hoàn thành',
              'AI không tìm thấy sản phẩm tương đồng. Thử ảnh khác.',
            );
          }
        } catch (error) {
          console.error('Lỗi Tìm kiếm Hình ảnh:', error);
          if (!isVisualSearchMode)
            Alert.alert(
              'Lỗi Kết Nối',
              `Không thể kết nối Server AI: ${(error as Error).message}.`,
            );
          setIsVisualSearchMode(false);
          loadProducts();
        } finally {
          setIsSearchingImage(false);
          setIsLoading(false);
        }
      },
    );
  };

  // Hàm để thoát khỏi chế độ tìm kiếm hình ảnh
  const handleExitVisualSearch = () => {
    setIsVisualSearchMode(false);
    setVisualSearchResults([]);
    setImageUriToScan(null); // Xóa ảnh đang quét
    loadProducts();
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng xuất.');
    }
  };

  // Hàm nạp dữ liệu mẫu & Cập nhật kho (Giữ nguyên)
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

  // Quyết định danh sách sản phẩm hiển thị
  const displayProducts = isVisualSearchMode ? visualSearchResults : products;
  const listIsLoading = isLoading || isSearchingImage;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        {/* ... (GIỮ NGUYÊN CODE headerContainer) ... */}
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
            <TouchableOpacity
              onPress={handleDataAction}
              style={{
                marginRight: 10,
                padding: 5,
                backgroundColor: 'white',
                borderRadius: 5,
              }}
            ></TouchableOpacity>

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

        {/* [CẬP NHẬT] Ô tìm kiếm và nút Camera */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor="#C0C0C0"
            editable={!isVisualSearchMode} // Tắt nhập liệu khi tìm kiếm hình ảnh
            // [MỚI] Gán giá trị và hàm thay đổi
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch} // Chạy tìm kiếm khi nhấn Enter
          />
          <TouchableOpacity style={styles.searchIcon} onPress={handleSearch}>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>

          {/* [MỚI] Nút Camera/Tải ảnh */}
          <TouchableOpacity
            style={styles.cameraIcon}
            onPress={handleImagePickAndSearch}
            disabled={isSearchingImage}
          >
            <Text style={styles.searchIconText}>
              {isSearchingImage ? '...' : '📸'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentScrollView}>
        {/* -------------------- HIỂN THỊ KHU VỰC QUÉT ẢNH AI -------------------- */}
        {isVisualSearchMode && imageUriToScan && (
          <View style={styles.scanWrapper}>
            <Text style={styles.scanStatusText}>
              {isSearchingImage
                ? 'AI Vision Đang Quét Đặc Trưng...'
                : 'Kết quả tìm kiếm hình ảnh:'}
            </Text>

            <VisualSearchScanArea
              uri={imageUriToScan}
              isScanning={isSearchingImage}
            />

            <TouchableOpacity
              onPress={handleExitVisualSearch}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.exitButtonText}>
                Thoát Tìm kiếm Hình ảnh ❌
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* -------------------- Thanh Categories -------------------- */}
        {!isVisualSearchMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContainer}
            onScrollBeginDrag={() => setSearchText('')}
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
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isVisualSearchMode
              ? 'Sản Phẩm Tương Tự'
              : searchText
              ? `Kết quả cho: "${searchText}"`
              : `Sản Phẩm ${
                  categories.find(c => c.id === activeCategory)?.name ||
                  'Nổi Bật'
                }`}
          </Text>
        </View>

        {/* -------------------- DANH SÁCH SẢN PHẨM -------------------- */}
        {listIsLoading ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <ActivityIndicator size="large" color="#FF6F00" />
            <Text style={{ marginTop: 15, color: '#666', fontSize: 16 }}>
              {isSearchingImage
                ? 'AI đang tìm kiếm vector tương đồng...'
                : 'Đang tải dữ liệu sản phẩm chi tiết...'}
            </Text>
          </View>
        ) : displayProducts.length > 0 ? (
          <FlatList
            data={displayProducts}
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
            <Text style={styles.emptyStateTitle}>
              {isVisualSearchMode || searchText
                ? 'Không tìm thấy kết quả'
                : 'Chưa có sản phẩm nào'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {isVisualSearchMode
                ? 'Thử tìm kiếm với ảnh khác hoặc thoát chế độ tìm kiếm.'
                : searchText
                ? `Không có sản phẩm nào khớp với từ khóa "${searchText}".`
                : 'Bấm nút "⚙ DATA" ở góc trên để tạo dữ liệu'}
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
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabText}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// =======================================================
// STYLES
// =======================================================

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
    bottom: 10,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingRight: 10,
  },
  searchIcon: { padding: 5 },
  searchIconText: { fontSize: 18, color: '#FF6F00' },

  // [STYLE MỚI] Nút Camera/Tải ảnh
  cameraIcon: {
    paddingLeft: 10,
    paddingRight: 5,
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
  },

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

  // [STYLE MỚI CHO KHU VỰC QUÉT]
  scanWrapper: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scanStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 10,
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderRadius: 15,
    overflow: 'hidden', // Quan trọng để hiệu ứng quét không tràn ra ngoài
    borderWidth: 2,
    borderColor: '#FF6F00',
    position: 'relative',
  },
  scanImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tối nhẹ ảnh khi quét
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: 4, // Độ dày của sóng
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Màu sóng (trắng)
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  scanActivityIndicator: {
    position: 'absolute',
  },
  // ------------------------------------------------------------------

  visualSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: '#FFF3E0', // Nền màu cam nhạt
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  visualSearchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  exitButtonText: {
    fontSize: 14,
    color: '#FF6F00',
    fontWeight: '600',
  },

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
  originalPriceText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountTag: {
    backgroundColor: '#FFF0F1',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  discountText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold' },
  finalPriceText: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' },

  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
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
