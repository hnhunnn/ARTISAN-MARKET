import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Product } from '../../backend/productService';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { addToCart, cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const { product } = route.params as { product: Product };
  const [quantity, setQuantity] = useState(1);

  // State lưu danh sách đánh giá
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const isLiked = isInWishlist(product.id);
  const totalCartItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Lấy danh sách đánh giá từ Firebase
  useEffect(() => {
    if (!product?.id) return;

    // 1. Nguồn chính: Collection 'reviews'
    const unsub1 = firestore()
      .collection('reviews')
      .where('productId', '==', product.id)
      .onSnapshot(
        snapshot => {
          const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Lưu vào state tạm hoặc gộp luôn nếu không dùng nguồn order cũ
          // Ở đây mình sẽ giả định là dùng nguồn reviews chính là chủ yếu
          setReviews(
            list.sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ),
          );
          setLoadingReviews(false);
        },
        error => console.log('Lỗi review chuẩn:', error),
      );

    // Nếu bạn muốn hỗ trợ cả đơn hàng cũ (orders collection) thì giữ lại logic cũ
    // Nhưng với dữ liệu mới bạn cung cấp (có adminReply), nó nằm trong collection nào thì code này sẽ lấy từ đó.
    // Code này đang ưu tiên lấy từ collection 'reviews'.

    return () => {
      unsub1();
    };
  }, [product.id]);

  const handleAddToCart = () => {
    const currentStock = product.quantity ?? 0;
    if (currentStock === 0) {
      Alert.alert('Thông báo', 'Sản phẩm này đã hết hàng!');
      return;
    }
    if (quantity > currentStock) {
      Alert.alert('Thông báo', `Chỉ còn ${currentStock} sản phẩm trong kho.`);
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
  };

  const handleBuyNow = () => {
    const currentStock = product.quantity ?? 0;
    if (quantity > currentStock || currentStock === 0) {
      Alert.alert('Thông báo', 'Sản phẩm không đủ số lượng.');
      return;
    }
    addToCart(product);
    (navigation as any).navigate('Cart');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text
          key={i}
          style={{ color: i <= rating ? '#FFD700' : '#E0E0E0', fontSize: 12 }}
        >
          ★
        </Text>,
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- HEADER ẢNH --- */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.headerIconText}>{'<'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartButtonHeader}
            onPress={() => (navigation as any).navigate('Cart')}
          >
            <Text style={{ fontSize: 20 }}>🛒</Text>
            {totalCartItems > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {totalCartItems > 99 ? '99+' : totalCartItems}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* --- THÔNG TIN CHI TIẾT --- */}
        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryTag}>
              {product.category || 'Thủ công'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.ratingBox}>
                <Text style={{ color: '#FFD700' }}>⭐</Text>
                <Text style={styles.ratingText}>
                  {reviews.length > 0
                    ? (
                        reviews.reduce((acc, r) => acc + (r.rating || 5), 0) /
                        reviews.length
                      ).toFixed(1)
                    : product.rating || 5.0}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heartBox}
                onPress={() => toggleWishlist(product)}
              >
                <Text style={{ fontSize: 18, color: isLiked ? 'red' : '#ccc' }}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={styles.productPrice}>
              {product.price.toLocaleString('vi-VN')} đ
            </Text>
            <Text style={styles.stockText}>Kho: {product.quantity ?? 0}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
          <Text style={styles.description}>
            {product.description || 'Đang cập nhật...'}
          </Text>

          <View style={styles.quantityContainer}>
            <Text style={styles.sectionTitle}>Số lượng mua</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qButton}
                onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
              >
                <Text style={styles.qText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qButton}
                onPress={() => setQuantity(prev => prev + 1)}
              >
                <Text style={styles.qText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* --- DANH SÁCH ĐÁNH GIÁ --- */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.sectionTitle}>
                Đánh giá ({reviews.length})
              </Text>
            </View>

            {loadingReviews ? (
              <ActivityIndicator size="small" color="#FF6F00" />
            ) : reviews.length === 0 ? (
              <Text style={styles.emptyReviewText}>Chưa có đánh giá nào.</Text>
            ) : (
              reviews.map(review => (
                <View key={review.id} style={styles.reviewItem}>
                  {/* Header Review */}
                  <View style={styles.reviewUserRow}>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>
                          {review.userName
                            ? review.userName.charAt(0).toUpperCase()
                            : 'U'}
                        </Text>
                      </View>
                      <Text style={styles.reviewUserName}>
                        {review.userName || 'Người dùng'}
                      </Text>
                    </View>
                    {renderStars(review.rating)}
                  </View>

                  {/* Nội dung Review */}
                  <Text style={styles.reviewContent}>{review.comment}</Text>

                  <Text style={styles.reviewDate}>
                    {review.createdAt
                      ? new Date(
                          review.createdAt.seconds * 1000,
                        ).toLocaleDateString('vi-VN')
                      : ''}
                  </Text>

                  {/* --- [MỚI] ADMIN REPLY (HIỂN THỊ NẾU CÓ) --- */}
                  {review.adminReply && (
                    <View style={styles.adminReplyBox}>
                      <View style={styles.adminReplyHeader}>
                        <Text style={styles.adminReplyIcon}>💬</Text>
                        <Text style={styles.adminReplyTitle}>
                          Phản hồi từ Shop
                        </Text>
                      </View>
                      <Text style={styles.adminReplyContent}>
                        {review.adminReply}
                      </Text>
                      {review.repliedAt && (
                        <Text style={styles.adminReplyDate}>
                          {new Date(
                            review.repliedAt.seconds * 1000,
                          ).toLocaleDateString('vi-VN')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
          <Text style={styles.cartBtnText}>Thêm vào giỏ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
          <Text style={styles.buyBtnText}>Mua ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 20 },
  imageContainer: { width: '100%', height: 350, backgroundColor: '#f0f0f0' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2,
  },

  cartButtonHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  detailsContainer: {
    flex: 1,
    marginTop: -30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTag: {
    color: '#FF6F00',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: { marginLeft: 5, fontWeight: 'bold', color: '#333' },
  heartBox: {
    backgroundColor: '#f5f5f5',
    padding: 5,
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  productPrice: { fontSize: 26, fontWeight: 'bold', color: '#DB4437' },
  stockText: { fontSize: 14, color: '#777', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: { fontSize: 14, color: '#666', lineHeight: 22 },

  quantityContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  qButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  qValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },

  // Styles cho Review
  reviewSection: { marginTop: 10 },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  reviewItem: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  reviewUserName: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  reviewContent: { fontSize: 13, color: '#555', lineHeight: 18 },
  reviewDate: { fontSize: 11, color: '#999', marginTop: 5, textAlign: 'right' },
  emptyReviewText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },

  // [MỚI] Styles cho Admin Reply
  adminReplyBox: {
    marginTop: 10,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6F00',
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminReplyIcon: { fontSize: 14, marginRight: 5 },
  adminReplyTitle: { fontSize: 12, fontWeight: 'bold', color: '#FF6F00' },
  adminReplyContent: { fontSize: 13, color: '#333', fontStyle: 'italic' },
  adminReplyDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: 30,
  },
  cartBtn: {
    flex: 1,
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    marginRight: 10,
  },
  cartBtnText: { color: '#FF6F00', fontWeight: 'bold', fontSize: 16 },
  buyBtn: {
    flex: 1,
    backgroundColor: '#FF6F00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  buyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default ProductDetailScreen;
