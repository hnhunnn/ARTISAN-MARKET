// THÊM: import 'useState' và 'Alert'
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert, // Thêm Alert để thông báo
} from 'react-native';
// THÊM: import 'auth' và 'firestore'
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const { height } = Dimensions.get('window');

// Component BackIcon (Không đổi)
const BackIcon = () => <Text style={styles.backIcon}>{'<'}</Text>;

// THÊM: Nhận 'navigation' từ props
const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // THÊM: State để lưu trữ thông tin form
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // THAY ĐỔI: Dùng navigation.goBack() để quay lại
  const handleGoBack = () => {
    navigation.goBack();
  };

  // THÊM: Hàm xử lý logic đăng ký
  const handleRegister = async () => {
    // 1. Kiểm tra dữ liệu đầu vào
    if (!hoTen || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    // 2. Gọi Firebase
    try {
      // Tạo người dùng bằng email và mật khẩu
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );

      // Lấy user object
      const user = userCredential.user;

      // CẬP NHẬT QUAN TRỌNG: Lưu "Họ và tên" vào hồ sơ Firebase
      if (user) {
        // 1. Cập nhật hồ sơ Auth (tên hiển thị)
        await user.updateProfile({
          displayName: hoTen,
        });

        // 2. GHI VÀO NOSQL (FIRESTORE)
        // Tạo một document (hồ sơ) trong collection 'users'
        await firestore().collection('users').doc(user.uid).set({
          hoTen: hoTen,
          email: email,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // 3. Thông báo và quay lại
      Alert.alert(
        'Thành công',
        'Tạo tài khoản thành công! Vui lòng đăng nhập.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      // 4. Xử lý lỗi
      let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được sử dụng!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ!';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu (yêu cầu ít nhất 6 ký tự).';
      }
      Alert.alert('Đăng ký thất bại', errorMessage);
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Nút Quay Lại (Đã cập nhật logic) */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>

        {/* Phần Header (Không đổi) */}
        <View style={styles.header}>
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text style={styles.appName}>Tạo Tài Khoản</Text>
          <Text style={styles.tagline}>Tham gia cộng đồng nghệ nhân</Text>
        </View>

        {/* Phần Form Đăng Ký */}
        <View style={styles.registerCard}>
          {/* Input Họ và tên */}
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
            value={hoTen}
            onChangeText={setHoTen}
          />

          {/* Input Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* Input Mật Khẩu */}
          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Input Xác nhận mật khẩu */}
          <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Nút Tạo Tài Khoản */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Tạo Tài Khoản</Text>
          </TouchableOpacity>

          {/* Link Đăng Nhập */}
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={styles.loginLinkText}>
              <Text style={styles.boldText}>Đã có tài khoản?</Text> Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 0,
  },
  backButton: {
    position: 'absolute',
    top: 50, // Điều chỉnh vị trí theo hình ảnh
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  backIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginTop: height > 700 ? 50 : 30, // Điều chỉnh khoảng cách trên màn hình nhỏ
    marginBottom: 20,
  },
  sparkleIcon: {
    fontSize: 40,
    marginBottom: 5,
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
    marginBottom: 10,
  },
  registerCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    width: '100%',
    flex: 1, // Chiếm hết phần còn lại của màn hình
    alignItems: 'center',
    marginTop: 20,
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
  registerButton: {
    backgroundColor: '#FF6F00', // Màu cam của nút
    width: '90%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#555',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
});

export default RegisterScreen;
