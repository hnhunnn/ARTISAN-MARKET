import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>({});
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // State cho form chỉnh sửa
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const currentUser = auth().currentUser;

  // 1. Tải thông tin User và Đơn hàng
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // A. Lấy thông tin cá nhân
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      if (userDoc.exists) {
        const data = userDoc.data();
        setUserData(data);
        setName(data?.hoTen || '');
        setPhone(data?.sdt || '');
        setAddress(data?.diaChi || '');
      } else {
        setName(currentUser.displayName || '');
        setUserData({ email: currentUser.email });
      }

      // B. Lấy 3 đơn hàng gần nhất (để hiện ở phần tóm tắt dưới cùng)
      const ordersSnapshot = await firestore()
        .collection('orders')
        .where('userId', '==', currentUser.uid)
        .limit(10)
        .get();

      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      orders.sort(
        (a: any, b: any) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );

      setRecentOrders(orders.slice(0, 3));
    } catch (error) {
      console.error('Lỗi tải profile:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // 2. Hàm lưu thông tin
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    try {
      await firestore().collection('users').doc(currentUser.uid).set(
        {
          hoTen: name,
          sdt: phone,
          diaChi: address,
          email: currentUser.email,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân');
      setIsEditing(false);
      fetchData();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin');
    }
  };

  // 3. Đăng xuất
  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          await auth().signOut();
          clearCart();
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'confirmed':
        return '#2196F3';
      case 'shipping':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#777';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6F00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Card Thông tin cá nhân */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name
                  ? name.charAt(0).toUpperCase()
                  : currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emailText}>{currentUser?.email}</Text>
              <Text style={styles.uidText}>
                ID: {currentUser?.uid.slice(0, 8)}...
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                isEditing ? handleSaveProfile() : setIsEditing(true)
              }
            >
              <Text style={styles.editBtn}>{isEditing ? 'LƯU' : 'SỬA'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Form thông tin */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Họ tên:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập họ tên"
              />
            ) : (
              <Text style={styles.value}>{name || 'Chưa cập nhật'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>SĐT:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Nhập SĐT"
              />
            ) : (
              <Text style={styles.value}>{phone || 'Chưa cập nhật'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Địa chỉ:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Nhập địa chỉ"
                multiline
              />
            ) : (
              <Text style={styles.value}>{address || 'Chưa cập nhật'}</Text>
            )}
          </View>
        </View>

        {/* 2. Menu nhanh */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Text style={styles.menuIcon}>❤️</Text>
            <Text style={styles.menuText}>Sản phẩm yêu thích</Text>
            <Text style={styles.menuArrow}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.menuIcon}>🛒</Text>
            <Text style={styles.menuText}>Giỏ hàng của tôi</Text>
            <Text style={styles.menuArrow}>{'>'}</Text>
          </TouchableOpacity>

          {/* 👇 [MỚI] THÊM NÚT LỊCH SỬ ĐƠN HÀNG VÀO ĐÂY */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('OrderHistory')}
          >
            <Text style={styles.menuIcon}>📦</Text>
            <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
            <Text style={styles.menuArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Đơn hàng gần đây (Tóm tắt) */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đơn hàng mới nhất</Text>
            {/* Nút Xem tất cả ở đây cũng dẫn sang trang lịch sử */}
            <TouchableOpacity
              onPress={() => navigation.navigate('OrderHistory')}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có đơn hàng nào.</Text>
          ) : (
            recentOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                // Bấm vào card nhỏ này cũng ra chi tiết đơn hàng
                onPress={() => navigation.navigate('OrderDetail', { order })}
              >
                <View style={styles.orderRow}>
                  <Text style={styles.orderId}>
                    #{order.id.slice(0, 6).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {order.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.orderDate}>
                  {order.createdAt
                    ? new Date(
                        order.createdAt.seconds * 1000,
                      ).toLocaleDateString('vi-VN')
                    : ''}
                </Text>
                <View style={styles.orderRow}>
                  <Text style={styles.itemCount}>
                    {order.items?.length || 0} sản phẩm
                  </Text>
                  <Text style={styles.orderPrice}>
                    {order.totalPrice?.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>Trang chủ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Wishlist')}
        >
          <Text style={styles.tabIcon}>❤️</Text>
          <Text style={styles.tabText}>Yêu thích</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={styles.tabText}>Giỏ hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabTextActive}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#FF6F00',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  logoutText: { color: 'white', fontSize: 16, fontWeight: '500' },
  scrollContent: { padding: 15 },

  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  emailText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  uidText: { fontSize: 12, color: '#888' },
  editBtn: { color: '#FF6F00', fontWeight: 'bold', padding: 5 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { width: 70, fontSize: 14, color: '#666', fontWeight: '500' },
  value: { flex: 1, fontSize: 14, color: '#333', fontWeight: 'bold' },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#FF6F00',
    paddingVertical: 2,
    fontSize: 14,
    color: '#333',
  },

  // Menu
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: { fontSize: 20, marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, color: '#333' },
  menuArrow: { color: '#CCC', fontSize: 16 },

  // Orders
  ordersSection: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  seeAllText: { color: '#FF6F00', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  orderCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  orderDate: { fontSize: 12, color: '#888', marginVertical: 5 },
  itemCount: { fontSize: 14, color: '#555' },
  orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#DB4437' },

  // Tab Bar
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
});

export default ProfileScreen;
