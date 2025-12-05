import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

const OrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const { order: initialOrder } = route.params || {};
  const [order, setOrder] = useState<any>(initialOrder);

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // --- STATE ADMIN EDIT ---
  const [editName, setEditName] = useState(order?.customerName || '');
  const [editPhone, setEditPhone] = useState(order?.phone || '');
  const [editAddress, setEditAddress] = useState(order?.address || '');
  const [editStatus, setEditStatus] = useState(order?.status || 'pending');
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // --- STATE USER ACTIONS ---
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<
    'cancel' | 'return' | 'rate' | null
  >(null);
  const [reason, setReason] = useState('');
  const [ratingStar, setRatingStar] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialOrder?.id) return;
    const unsubscribe = firestore()
      .collection('orders')
      .doc(initialOrder.id)
      .onSnapshot(doc => {
        if (doc.exists) {
          const data = { id: doc.id, ...doc.data() };
          setOrder(data);

          if (!isEditing) {
            setEditName(data.customerName);
            setEditPhone(data.phone);
            setEditAddress(data.address);
            setEditStatus(data.status);
          }
        }
      });
    return () => unsubscribe();
  }, [initialOrder?.id, isEditing]);

  if (!order)
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy đơn hàng</Text>
      </View>
    );

  const STATUS_LIST = [
    { id: 'pending', label: 'Chờ xác nhận', color: '#FF9800' },
    { id: 'confirmed', label: 'Chờ lấy hàng', color: '#2196F3' },
    { id: 'shipping', label: 'Đang giao hàng', color: '#9C27B0' },
    { id: 'delivered', label: 'Giao thành công', color: '#4CAF50' },
    { id: 'cancelled', label: 'Đã hủy', color: '#F44336' },
    { id: 'returned', label: 'Trả hàng/Hoàn tiền', color: '#795548' },
  ];

  const getStatusInfo = (status: string) => {
    return (
      STATUS_LIST.find(s => s.id === status) || { label: status, color: '#777' }
    );
  };

  // --- [LOGIC MỚI] Kiểm tra xem đơn hàng có được phép sửa không ---
  // Không cho sửa nếu đã: Giao thành công, Hủy, hoặc Trả hàng
  const isFinalStatus = ['delivered', 'cancelled', 'returned'].includes(
    order.status,
  );

  // --- ADMIN ACTIONS ---
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      await firestore().collection('orders').doc(order.id).update({
        customerName: editName,
        phone: editPhone,
        address: editAddress,
        status: editStatus,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setIsEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin đơn hàng.');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi.');
    } finally {
      setLoading(false);
    }
  };

  // --- USER ACTIONS ---
  const openActionModal = (type: 'cancel' | 'return' | 'rate') => {
    setActionType(type);
    setReason('');
    setRatingStar(5);
    setActionModalVisible(true);
  };

  const handleSubmitAction = async () => {
    if (
      (actionType === 'cancel' || actionType === 'return') &&
      !reason.trim()
    ) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {};

      if (actionType === 'cancel') {
        updateData.status = 'cancelled';
        updateData.cancelReason = reason;
        updateData.cancelledAt = firestore.FieldValue.serverTimestamp();
      } else if (actionType === 'return') {
        updateData.status = 'returned';
        updateData.returnReason = reason;
        updateData.returnedAt = firestore.FieldValue.serverTimestamp();
      } else if (actionType === 'rate') {
        updateData.isRated = true;
        updateData.ratingStar = ratingStar;
        updateData.ratingComment = reason;
        updateData.ratedAt = firestore.FieldValue.serverTimestamp();
      }

      await firestore().collection('orders').doc(order.id).update(updateData);

      Alert.alert(
        'Thành công',
        actionType === 'rate'
          ? 'Cảm ơn đánh giá của bạn!'
          : 'Yêu cầu đã được gửi.',
      );
      setActionModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Thao tác thất bại. Kiểm tra kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => setRatingStar(star)}>
          <Text
            style={[
              styles.starIcon,
              { color: star <= ratingStar ? '#FFD700' : '#E0E0E0' },
            ]}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Sửa đơn hàng' : 'Chi tiết đơn hàng'}
        </Text>

        {/* Nút Admin Edit: Chỉ hiện khi đơn hàng CHƯA hoàn tất */}
        {!isFinalStatus ? (
          <TouchableOpacity
            onPress={() =>
              isEditing ? handleSaveChanges() : setIsEditing(true)
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.editBtnText}>
                {isEditing ? 'LƯU' : 'SỬA'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          // View rỗng để giữ layout cân đối
          <View style={{ width: 30 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. TRẠNG THÁI */}
        <View style={styles.section}>
          <Text style={styles.label}>Trạng thái đơn hàng:</Text>
          {isEditing ? (
            <TouchableOpacity
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusInfo(editStatus).color,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                },
              ]}
              onPress={() => setStatusModalVisible(true)}
            >
              <Text style={styles.statusText}>
                {getStatusInfo(editStatus).label}
              </Text>
              <Text style={styles.statusText}>▼</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusInfo(order.status).color },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusInfo(order.status).label}
              </Text>
            </View>
          )}
          {order.cancelReason && (
            <Text style={styles.errorText}>
              Lý do hủy: {order.cancelReason}
            </Text>
          )}
          {order.returnReason && (
            <Text style={styles.errorText}>
              Lý do trả: {order.returnReason}
            </Text>
          )}
        </View>

        {/* 2. NGƯỜI NHẬN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          <View style={styles.divider} />
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Tên người nhận"
              />
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="Số điện thoại"
              />
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
                placeholder="Địa chỉ giao hàng"
              />
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Tên:</Text> {order.customerName}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.bold}>SĐT:</Text> {order.phone}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Đ/C:</Text> {order.address}
              </Text>
            </>
          )}
        </View>

        {/* 3. SẢN PHẨM */}
        <View style={styles.section}>
          <View style={styles.shopHeader}>
            <Text style={styles.shopName}>ARTISAN STORE</Text>
            <Text style={styles.itemCount}>
              ({order.items?.length} sản phẩm)
            </Text>
          </View>
          <View style={styles.divider} />
          {order.items?.map((item: any, index: number) => (
            <View key={index} style={styles.productItem}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>
                    {item.price.toLocaleString('vi-VN')} đ
                  </Text>
                  <Text style={styles.productQty}>x{item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Text style={styles.totalLabel}>Thành tiền:</Text>
            <Text style={styles.totalPrice}>
              {order.totalPrice.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>

        {/* 4. MÃ ĐƠN & THANH TOÁN */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.subLabel}>Mã đơn hàng</Text>
            <Text style={styles.subValue}>
              {order.id.slice(0, 10).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subLabel}>Thời gian đặt</Text>
            <Text style={styles.subValue}>
              {order.createdAt
                ? new Date(order.createdAt.seconds * 1000).toLocaleString(
                    'vi-VN',
                  )
                : ''}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subLabel}>Thanh toán</Text>
            <Text style={styles.subValue}>
              {order.paymentMethod === 'stripe'
                ? 'Thẻ Quốc Tế'
                : 'COD (Tiền mặt)'}
            </Text>
          </View>
        </View>

        {/* 5. NÚT HÀNH ĐỘNG CHO USER */}
        {!isEditing && (
          <View style={styles.actionContainer}>
            {/* Nút Hủy */}
            {(order.status === 'pending' || order.status === 'confirmed') && (
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => openActionModal('cancel')}
              >
                <Text style={styles.btnTextWhite}>Hủy đơn hàng</Text>
              </TouchableOpacity>
            )}

            {/* Nút Đánh giá & Trả hàng */}
            {order.status === 'delivered' && (
              <View style={styles.rowAction}>
                <TouchableOpacity
                  style={styles.btnReturn}
                  onPress={() => openActionModal('return')}
                >
                  <Text style={styles.btnTextWhite}>Yêu cầu Trả hàng</Text>
                </TouchableOpacity>

                {!order.isRated ? (
                  <TouchableOpacity
                    style={styles.btnRate}
                    onPress={() => openActionModal('rate')}
                  >
                    <Text style={styles.btnTextWhite}>Đánh giá</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.btnRated}>
                    <Text style={styles.btnTextOrange}>Đã đánh giá</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {isEditing && (
          <Text style={styles.noteText}>
            * Đang ở chế độ chỉnh sửa của Admin.
          </Text>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* --- MODALs --- */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
            {STATUS_LIST.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.modalItem}
                onPress={() => {
                  setEditStatus(s.id);
                  setStatusModalVisible(false);
                }}
              >
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={styles.modalItemText}>{s.label}</Text>
                {editStatus === s.id && (
                  <Text style={{ color: '#FF6F00' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={{ color: '#666' }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>
                {actionType === 'cancel'
                  ? 'Lý do hủy đơn'
                  : actionType === 'return'
                  ? 'Lý do trả hàng'
                  : 'Đánh giá sản phẩm'}
              </Text>

              {actionType === 'rate' && renderStars()}

              <TextInput
                style={styles.reasonInput}
                placeholder={
                  actionType === 'rate'
                    ? 'Chia sẻ cảm nhận...'
                    : 'Nhập lý do...'
                }
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.btnModalCancel}
                  onPress={() => setActionModalVisible(false)}
                >
                  <Text style={styles.btnTextBlack}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnModalSubmit}
                  onPress={handleSubmitAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.btnTextWhite}>Gửi</Text>
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
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  content: { padding: 10 },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },

  statusBadge: { padding: 12, borderRadius: 6, alignItems: 'center' },
  statusText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: '#D32F2F', marginTop: 8, fontStyle: 'italic' },

  infoText: { fontSize: 15, color: '#333', marginBottom: 6 },
  bold: { fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
  },

  shopHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  shopName: { fontWeight: 'bold', fontSize: 15 },
  itemCount: { color: '#777' },
  productItem: { flexDirection: 'row', marginTop: 10 },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  productInfo: { flex: 1, justifyContent: 'space-between' },
  productName: { fontSize: 14, color: '#333' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  productPrice: { fontWeight: 'bold', color: '#333' },
  productQty: { color: '#666' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: { fontSize: 16, color: '#333' },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#FF6F00' },
  subLabel: { fontSize: 13, color: '#888' },
  subValue: { fontSize: 13, color: '#333' },

  // Buttons
  actionContainer: { marginTop: 10 },
  btnCancel: {
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  rowAction: { flexDirection: 'row', justifyContent: 'space-between' },
  btnReturn: {
    backgroundColor: '#D32F2F',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  btnRate: {
    backgroundColor: '#FF6F00',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  btnRated: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6F00',
  },
  btnTextWhite: { color: 'white', fontWeight: 'bold' },
  btnTextOrange: { color: '#FF6F00', fontWeight: 'bold' },
  btnTextBlack: { color: '#333', fontWeight: 'bold' },

  noteText: {
    textAlign: 'center',
    color: '#FF6F00',
    fontStyle: 'italic',
    marginTop: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  modalItemText: { flex: 1, fontSize: 16, marginLeft: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  modalClose: { marginTop: 15, alignItems: 'center', padding: 10 },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnModalCancel: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#EEE',
    borderRadius: 8,
  },
  btnModalSubmit: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#FF6F00',
    borderRadius: 8,
  },

  // Stars
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starIcon: { fontSize: 30, marginHorizontal: 5 },
});

export default OrderDetailScreen;
