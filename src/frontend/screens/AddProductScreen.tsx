import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';

// Khắc phục cảnh báo: Chỉ bóc tách (destructuring) biến 'width' vì 'height' không được sử dụng
const { width } = Dimensions.get('window');

// Để đảm bảo code chạy, tôi sẽ tạm dùng Text cho Icon mũi tên
const BackIcon = () => (
  <Text style={styles.backIcon}>{'<'}</Text> // Thay thế bằng Icon thực tế nếu có
);

// Tối ưu hóa prop: Nếu bạn không sử dụng 'navigation' trong file này, chỉ cần để trống hoặc loại bỏ nó.
const AddProductScreen: React.FC = ({}: any) => {
  const handleGoBack = () => {
    // Nếu bạn có React Navigation: navigation.goBack();
    console.log('Quay lại Trang chủ');
  };

  const handleAddProduct = () => {
    console.log('Đã nhấn nút Thêm Sản Phẩm');
    // Logic xử lý upload sản phẩm
    // LƯU Ý: Phải đảm bảo trường Discount được thu thập và gửi đi
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Màu Cam Đậm */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm Sản Phẩm</Text>
        </View>

        {/* Form Nội dung (có thể cuộn) */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            {/* Tên sản phẩm */}
            <Text style={styles.label}>Tên sản phẩm</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Bình gốm thủ công Bát Tràng"
            />

            {/* Giá, Số lượng, và GIẢM GIÁ (Chia thành 3 cột) */}
            <View style={styles.row}>
              {/* Giá */}
              <View style={styles.thirdInputContainer}>
                <Text style={styles.label}>Giá (VNĐ)</Text>
                <TextInput
                  style={styles.thirdInput}
                  placeholder="250000"
                  keyboardType="numeric"
                />
              </View>

              {/* Số lượng */}
              <View style={styles.thirdInputContainer}>
                <Text style={styles.label}>Số lượng</Text>
                <TextInput
                  style={styles.thirdInput}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>

              {/* MÃ GIẢM GIÁ (%) */}
              <View style={styles.thirdInputContainer}>
                <Text style={styles.label}>Giảm giá (%)</Text>
                <TextInput
                  style={styles.thirdInput}
                  placeholder="15"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Danh mục (Dropdown Placeholder) */}
            <Text style={styles.label}>Danh mục</Text>
            <TouchableOpacity
              style={styles.dropdownInput}
              onPress={() => console.log('Chọn Danh mục')}
            >
              <Text style={styles.dropdownPlaceholder}>Chọn danh mục</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            {/* Chất liệu */}
            <Text style={styles.label}>Chất liệu</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Gốm nung cao cấp, Tre tự nhiên"
            />

            {/* Biểu tượng sản phẩm (Dropdown Placeholder) */}
            <Text style={styles.label}>Biểu tượng sản phẩm</Text>
            <TouchableOpacity
              style={styles.dropdownInput}
              onPress={() => console.log('Chọn Biểu tượng')}
            >
              <Text style={styles.dropdownPlaceholder}>Chọn biểu tượng</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            {/* Mô tả chi tiết (Multiline Input) */}
            <Text style={styles.label}>Mô tả chi tiết</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Mô tả chi tiết về sản phẩm, nguồn gốc, đặc điểm nổi bật..."
              multiline
              numberOfLines={4}
            />
          </View>
          <View style={{ height: 120 }} />{' '}
          {/* Thêm khoảng trống cho nút cố định */}
        </ScrollView>

        {/* NÚT THÊM SẢN PHẨM (CỐ ĐỊNH) */}
        <TouchableOpacity
          style={styles.fixedSubmitButton}
          onPress={handleAddProduct}
        >
          <Text style={styles.submitButtonText}>Thêm Sản Phẩm</Text>
        </TouchableOpacity>

        {/* Bottom Tab Bar (Giữ nguyên) */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={styles.tabTextActive}>Trang chủ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabIcon}>🛒</Text>
            <Text style={styles.tabText}>Giỏ hàng</Text>
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
    backgroundColor: '#FF6F00', // Đã sửa màu header
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
  scrollContent: {
    padding: 20,
    backgroundColor: '#F7F7F7',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // [MỚI] Sửa lại kích thước cho 3 cột
  thirdInputContainer: {
    width: '31%', // Đảm bảo tổng cộng khoảng 93% để chừa khoảng trống
  },
  thirdInput: {
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    fontSize: 16,
  },
  // [ĐÃ XÓA] halfInputContainer và halfInput

  dropdownInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  dropdownIcon: {
    color: '#333',
    fontSize: 16,
  },
  // Style Nút cố định ở cuối màn hình (trên Tab Bar)
  fixedSubmitButton: {
    backgroundColor: '#FF6F00', // Màu cam
    width: '90%',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute', // Cố định vị trí
    bottom: 70, // Đặt ngay trên Bottom Tab Bar (60px height + 10px margin)
    alignSelf: 'center', // Đặt giữa màn hình
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Bottom Tab Bar Styles
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

export default AddProductScreen;
