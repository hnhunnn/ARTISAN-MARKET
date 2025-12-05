import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');

const WishlistScreen = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigation = useNavigation();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        (navigation as any).navigate('ProductDetail', { product: item })
      }
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.price}>{item.price.toLocaleString('vi-VN')} đ</Text>

        <View style={styles.actions}>
          {/* Nút xóa khỏi yêu thích */}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => toggleWishlist(item)}
          >
            <Text>💔 Bỏ thích</Text>
          </TouchableOpacity>

          {/* Nút thêm nhanh vào giỏ */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addToCart(item)}
          >
            <Text style={{ color: 'white' }}>+ Giỏ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 10 }}
        >
          <Text style={{ fontSize: 24, color: 'white' }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sản phẩm yêu thích ({wishlist.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 50 }}>💔</Text>
          <Text style={{ marginTop: 10, color: '#666' }}>
            Chưa có sản phẩm yêu thích
          </Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6F00',
    paddingVertical: 15,
    paddingTop: 40,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  image: { width: 90, height: 90, borderRadius: 8, resizeMode: 'cover' },
  info: { flex: 1, marginLeft: 10, justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#FF6F00' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  removeBtn: { padding: 5, backgroundColor: '#ffebee', borderRadius: 5 },
  addBtn: {
    padding: 5,
    backgroundColor: '#FF6F00',
    borderRadius: 5,
    paddingHorizontal: 15,
  },
});

export default WishlistScreen;
