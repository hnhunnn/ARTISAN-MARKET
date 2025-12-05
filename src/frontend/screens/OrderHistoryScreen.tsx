import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';

const OrderHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { initialTab } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab || 'pending');

  // --- STATE CHO MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<
    'cancel' | 'return' | 'rate' | null
  >(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // State nhập lý do (cho Hủy/Trả)
  const [reason, setReason] = useState('');

  // [FIX] State đánh giá: Dùng Key là "productId_index" để tránh trùng lặp nếu ID giống nhau
  const [productReviews, setProductReviews] = useState<{
    [key: string]: { rating: number; comment: string };
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTab) {
      if (['confirmed', 'shipper', 'shipped'].includes(initialTab)) {
        setActiveTab('shipping');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  const TABS = [
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'returned', label: 'Trả hàng/Hoàn tiền' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('orders')
      .where('userId', '==', user.uid)
      .onSnapshot(
        querySnapshot => {
          const ordersList: any[] = [];
          querySnapshot.forEach(documentSnapshot => {
            ordersList.push({
              ...documentSnapshot.data(),
              id: documentSnapshot.id,
            });
          });
          ordersList.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          );
          setOrders(ordersList);
          setLoading(false);
        },
        error => {
          console.error('Lỗi tải đơn hàng:', error);
          setLoading(false);
        },
      );

    return () => subscriber();
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'shipping') {
      return orders.filter(order => {
        const s = (order.status || '').toLowerCase();
        return (
          s === 'shipping' ||
          s === 'shipper' ||
          s === 'confirmed' ||
          s === 'shipped'
        );
      });
    }
    return orders.filter(order => order.status === activeTab);
  }, [orders, activeTab]);

  const handlePressOrder = (item: any) => {
    navigation.navigate('OrderDetail', { order: item });
  };

  // --- MỞ MODAL ---
  const openActionModal = (type: 'cancel' | 'return' | 'rate', order: any) => {
    setActionType(type);
    setSelectedOrder(order);

    if (type === 'rate') {
      // Khởi tạo state đánh giá
      const initialReviews: any = {};
      if (order.items) {
        order.items.forEach((item: any, index: number) => {
          // [FIX] Tạo key duy nhất kết hợp ID và Index
          const uniqueKey = `${item.id}_${index}`;
          initialReviews[uniqueKey] = { rating: 5, comment: '' };
        });
      }
      setProductReviews(initialReviews);
    } else {
      setReason('');
    }

    setModalVisible(true);
  };

  // [FIX] Helper cập nhật dùng uniqueKey
  const updateProductReview = (
    uniqueKey: string,
    field: 'rating' | 'comment',
    value: any,
  ) => {
    setProductReviews(prev => ({
      ...prev,
      [uniqueKey]: {
        ...prev[uniqueKey],
        [field]: value,
      },
    }));
  };

  // --- XỬ LÝ LƯU ---
  const handleSubmitAction = async () => {
    if (!selectedOrder) return;

    if (
      (actionType === 'cancel' || actionType === 'return') &&
      !reason.trim()
    ) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do.');
      return;
    }

    setIsSubmitting(true);
    const currentUser = auth().currentUser;

    try {
      const batch = firestore().batch();
      const orderRef = firestore().collection('orders').doc(selectedOrder.id);

      if (actionType === 'rate') {
        // 1. Lưu review
        if (selectedOrder.items) {
          selectedOrder.items.forEach((item: any, index: number) => {
            // [FIX] Lấy dữ liệu từ uniqueKey
            const uniqueKey = `${item.id}_${index}`;
            const reviewData = productReviews[uniqueKey];

            const reviewRef = firestore().collection('reviews').doc();

            batch.set(reviewRef, {
              productId: item.id,
              productName: item.name,
              orderId: selectedOrder.id,
              userId: currentUser?.uid,
              userName: selectedOrder.customerName || 'Khách hàng',
              userAvatar: currentUser?.photoURL || null,
              rating: reviewData?.rating || 5,
              comment: reviewData?.comment || '',
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
          });
        }

        // 2. Update trạng thái đơn hàng
        batch.update(orderRef, {
          isRated: true,
          ratedAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const updateData: any = {};
        if (actionType === 'cancel') {
          updateData.status = 'cancelled';
          updateData.cancelReason = reason;
          updateData.cancelledAt = firestore.FieldValue.serverTimestamp();
        } else {
          updateData.status = 'returned';
          updateData.returnReason = reason;
          updateData.returnedAt = firestore.FieldValue.serverTimestamp();
        }
        batch.update(orderRef, updateData);
      }

      await batch.commit();

      let msg =
        actionType === 'rate' ? 'Đánh giá thành công!' : 'Thao tác thành công!';
      Alert.alert('Thông báo', msg);
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => handlePressOrder(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.shopName}>ARTISAN STORE</Text>
        <Text style={styles.statusTextTop}>
          {item.status === 'shipper' || item.status === 'shipped'
            ? 'Shipper đang giao'
            : item.status === 'confirmed'
            ? 'Chờ lấy hàng'
            : TABS.find(t => t.id === item.status)?.label ||
              item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.productPreview}>
        <Image
          source={{ uri: item.items && item.items[0]?.imageUrl }}
          style={styles.imageBox}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.items && item.items[0]?.name}
          </Text>
          <Text style={styles.productQty}>
            x{item.items && item.items[0]?.quantity}
          </Text>
          {item.items && item.items.length > 1 && (
            <Text style={styles.moreItems}>
              ...và {item.items.length - 1} sản phẩm khác
            </Text>
          )}
        </View>
        <Text style={styles.itemPrice}>
          {item.items && item.items[0]?.price?.toLocaleString('vi-VN')} đ
        </Text>
      </View>

      <View style={styles.divider} />
      <View style={styles.cardFooter}>
        <Text style={styles.totalItemsText}>{item.items?.length} sản phẩm</Text>
        <View style={styles.totalMoneyContainer}>
          <Text style={styles.totalLabel}>Thành tiền: </Text>
          <Text style={styles.totalPrice}>
            {item.totalPrice?.toLocaleString('vi-VN')} đ
          </Text>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <Text style={styles.dateText}>
          {item.createdAt
            ? new Date(item.createdAt.seconds * 1000).toLocaleDateString(
                'vi-VN',
              )
            : ''}
        </Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => handlePressOrder(item)}
          >
            <Text style={styles.btnOutlineText}>Chi tiết</Text>
          </TouchableOpacity>

          {item.status === 'pending' && (
            <TouchableOpacity
              style={[
                styles.btnSolid,
                { backgroundColor: '#757575', marginLeft: 10 },
              ]}
              onPress={() => openActionModal('cancel', item)}
            >
              <Text style={styles.btnSolidText}>Hủy đơn</Text>
            </TouchableOpacity>
          )}

          {item.status === 'delivered' && (
            <>
              {!item.isRated ? (
                <TouchableOpacity
                  style={[
                    styles.btnOutline,
                    { marginLeft: 10, borderColor: '#FF6F00' },
                  ]}
                  onPress={() => openActionModal('rate', item)}
                >
                  <Text style={[styles.btnOutlineText, { color: '#FF6F00' }]}>
                    Đánh giá
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.ratedBadge, { marginLeft: 10 }]}>
                  <Text
                    style={{
                      color: '#FF6F00',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    Đã đánh giá
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.btnSolid,
                  { marginLeft: 10, backgroundColor: '#D32F2F' },
                ]}
                onPress={() => openActionModal('return', item)}
              >
                <Text style={styles.btnSolidText}>Trả hàng</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn mua</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && styles.activeTabItem,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6F00" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            </View>
          }
        />
      )}

      {/* --- MODAL CHUNG --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>
                {actionType === 'cancel'
                  ? 'Lý do hủy đơn hàng'
                  : actionType === 'return'
                  ? 'Lý do trả hàng/hoàn tiền'
                  : 'Đánh giá sản phẩm'}
              </Text>

              {/* VIEW ĐÁNH GIÁ (RATE) */}
              {actionType === 'rate' ? (
                <ScrollView style={{ maxHeight: 400 }}>
                  {selectedOrder?.items?.map((item: any, index: number) => {
                    const uniqueKey = `${item.id}_${index}`; // [FIX] Key duy nhất
                    return (
                      <View key={uniqueKey} style={styles.rateItemContainer}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 5,
                          }}
                        >
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 4,
                              marginRight: 10,
                            }}
                          />
                          <Text
                            style={{ fontWeight: 'bold', flex: 1 }}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </View>

                        {/* Chọn sao */}
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity
                              key={star}
                              onPress={() =>
                                updateProductReview(uniqueKey, 'rating', star)
                              }
                            >
                              <Text
                                style={[
                                  styles.starIconSmall,
                                  {
                                    color:
                                      star <=
                                      (productReviews[uniqueKey]?.rating || 5)
                                        ? '#FFD700'
                                        : '#E0E0E0',
                                  },
                                ]}
                              >
                                ★
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Nhập comment */}
                        <TextInput
                          style={styles.reviewInputSmall}
                          placeholder="Viết đánh giá của bạn..."
                          value={productReviews[uniqueKey]?.comment || ''}
                          onChangeText={text =>
                            updateProductReview(uniqueKey, 'comment', text)
                          }
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                // VIEW HỦY / TRẢ
                <TextInput
                  style={styles.reasonInput}
                  placeholder={
                    actionType === 'cancel' ? 'VD: Đổi ý...' : 'VD: Hàng lỗi...'
                  }
                  multiline
                  numberOfLines={4}
                  value={reason}
                  onChangeText={setReason}
                />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtnSubmit}
                  onPress={handleSubmitAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.modalBtnTextSubmit}>Gửi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#FF6F00',
    padding: 15,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24, color: 'white', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },

  tabContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: { borderBottomColor: '#FF6F00' },
  tabText: { fontSize: 14, color: '#666' },
  activeTabText: { color: '#FF6F00', fontWeight: 'bold' },

  listContent: { paddingBottom: 20 },
  card: { backgroundColor: 'white', marginTop: 10, padding: 15 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  statusTextTop: { color: '#FF6F00', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

  productPreview: { flexDirection: 'row', alignItems: 'flex-start' },
  imageBox: {
    width: 60,
    height: 60,
    backgroundColor: '#EEE',
    borderRadius: 4,
    marginRight: 10,
  },
  productName: { fontSize: 14, color: '#333', marginBottom: 4 },
  productQty: { fontSize: 12, color: '#888' },
  moreItems: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontSize: 14, color: '#333' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  totalItemsText: { fontSize: 12, color: '#888', marginRight: 10 },
  totalMoneyContainer: { flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#333' },
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: '#FF6F00' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: { fontSize: 12, color: '#999', flex: 1 },
  buttonGroup: { flexDirection: 'row', alignItems: 'center' },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#CCC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnOutlineText: { color: '#555', fontSize: 12 },
  btnSolid: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
  },
  btnSolidText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  ratedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
  },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 14, color: '#999' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },

  reasonInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalBtnCancel: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#EEE',
    borderRadius: 8,
  },
  modalBtnTextCancel: { color: '#333', fontWeight: 'bold' },
  modalBtnSubmit: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#FF6F00',
    borderRadius: 8,
  },
  modalBtnTextSubmit: { color: 'white', fontWeight: 'bold' },

  // Rate Item Styles
  rateItemContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
  },
  starRow: { flexDirection: 'row', marginBottom: 5 },
  starIconSmall: { fontSize: 30, marginRight: 5 },
  reviewInputSmall: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 5,
    padding: 8,
    height: 40,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
});

export default OrderHistoryScreen;
