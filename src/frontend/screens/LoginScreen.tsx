// THÊM: import 'useState' để quản lý text input
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert, // THÊM: 'Alert' để thông báo lỗi
} from 'react-native';
// THÊM: import 'auth' từ Firebase
import auth from '@react-native-firebase/auth';

// THÊM: Khai báo props, chúng ta cần 'navigation' để chuyển trang
const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // THÊM: State để lưu email và mật khẩu
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // THÊM: Hàm xử lý logic đăng nhập
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      // Dùng hàm của Firebase để đăng nhập
      await auth().signInWithEmailAndPassword(email, password);
      // Bạn không cần làm gì thêm, file App.tsx (từ hướng dẫn trước)
      // sẽ tự động phát hiện đăng nhập thành công và chuyển màn hình Home.
    } catch (error: any) {
      // <-- Sửa ở đây: Thêm ': any'
      // Xử lý các lỗi thường gặp
      let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        // <-- Sẽ hết lỗi
        errorMessage = 'Email hoặc mật khẩu không đúng!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ!';
      }
      Alert.alert('Đăng nhập thất bại', errorMessage);
      console.error(error);
    }
  };

  // THÊM: Hàm xử lý đăng nhập với tư cách khách
  const handleGuestLogin = async () => {
    try {
      await auth().signInAnonymously();
      // App.tsx cũng sẽ tự động phát hiện và chuyển màn hình Home
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể đăng nhập với tư cách khách.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Phần Header Màu Cam (Không đổi) */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo_1.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>Artisan Market</Text>
          <Text style={styles.tagline}>Khám phá nghệ thuật thủ công</Text>
        </View>

        {/* Phần Form Đăng Nhập */}
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Đăng Nhập</Text>

          {/* Input Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            // THÊM: value và onChangeText
            value={email}
            onChangeText={setEmail}
          />

          {/* Input Mật Khẩu */}
          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            secureTextEntry
            // THÊM: value và onChangeText
            value={password}
            onChangeText={setPassword}
          />

          {/* Nút Đăng Nhập */}
          <TouchableOpacity
            style={styles.loginButton}
            // THAY ĐỔI: Gọi hàm handleLogin
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Đăng Nhập</Text>
          </TouchableOpacity>

          {/* Link Đăng Ký */}
          <TouchableOpacity
            // THAY ĐỔI: Điều hướng sang màn hình Đăng ký
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              <Text style={styles.boldText}>Chưa có tài khoản?</Text> Đăng ký
              ngay
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tiếp tục với tư cách khách */}
        <TouchableOpacity
          style={styles.guestButton}
          // THAY ĐỔI: Gọi hàm đăng nhập ẩn danh
          onPress={handleGuestLogin}
        >
          <Text style={styles.guestButtonText}>Tiếp tục với tư cách khách</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Toàn bộ StyleSheet được giữ nguyên (Không thay đổi)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6F00', // Màu nền cam chính
  },
  container: {
    flex: 1,
    backgroundColor: '#FF6F00', // Màu nền cam chính
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
  },
  logo: {
    width: 90, // Kích thước logo
    height: 90,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: 'white',
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    marginLeft: '5%',
    marginBottom: 8,
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold',
    width: '90%',
  },
  input: {
    width: '90%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#FF6F00',
    width: '90%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerText: {
    fontSize: 15,
    color: '#555',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  guestButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  guestButtonText: {
    color: 'white',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
