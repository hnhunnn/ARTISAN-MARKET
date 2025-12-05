import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  writeBatch,
  DocumentData,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// ✅ FIX HOÀN CHỈNH: Tạo đơn hàng có userId (KHỚP FIRESTORE RULES)
export const createOrder = async (orderData: {
  userId: string; // ✅ BẮT BUỘC
  customerName: string;
  phone: string;
  address: string;
  totalPrice: number;
  items: any[];
}) => {
  try {
    const orderRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      date: serverTimestamp(),
    });

    console.log('✅ Đã tạo đơn hàng:', orderRef.id);
    return true;
  } catch (error) {
    console.error('❌ Lỗi tạo đơn hàng:', error);
    return false;
  }
};

// ======================= PRODUCT =======================

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  rating: number;
  category: string;
  quantity: number;
  description?: string;
}

export const fetchProductsFromFirestore = async (
  categoryId: string = 'all',
): Promise<Product[]> => {
  try {
    const productsCollection = collection(db, 'products');
    let productsQuery: any = productsCollection;

    if (categoryId && categoryId !== 'all') {
      productsQuery = query(
        productsCollection,
        where('category', '==', categoryId),
      );
    }

    const productSnapshot = await getDocs(productsQuery);
    if (productSnapshot.empty) return [];

    const productsList: Product[] = productSnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;

      return {
        id: doc.id,
        name: data.name || 'Sản phẩm không tên',
        price: data.price || 0,
        imageUrl: data.imageUrl || 'https://via.placeholder.com/150',
        rating: data.rating || 5.0,
        category: data.category || 'other',
        quantity: data.quantity !== undefined ? data.quantity : 100,
        description:
          data.description ||
          'Sản phẩm thủ công mỹ nghệ tinh xảo, chất lượng cao.',
      };
    });

    return productsList;
  } catch (error) {
    console.error('❌ Lỗi lấy sản phẩm:', error);
    return [];
  }
};

export const getUserInfo = async () => {
  try {
    const user = auth().currentUser;

    if (!user) {
      console.error('❌ Chưa đăng nhập Firebase');
      return null;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data();
    }

    return null;
  } catch (error) {
    console.error('❌ Lỗi lấy user:', error);
    return null;
  }
};
// --- [MỚI] Hàm trừ số lượng tồn kho sau khi mua ---
export const reduceStockAfterPurchase = async (cartItems: any[]) => {
  try {
    const batch = firestore().batch(); // Tạo một lô lệnh ghi

    cartItems.forEach(item => {
      const productRef = firestore().collection('products').doc(item.id);

      // Dùng FieldValue.increment(-soluong) để trừ an toàn
      // Cách này tốt hơn là đọc về rồi trừ, vì tránh được lỗi khi nhiều người mua cùng lúc
      batch.update(productRef, {
        quantity: firestore.FieldValue.increment(-item.quantity),
      });
    });

    await batch.commit(); // Thực thi tất cả lệnh cùng lúc
    console.log('Đã cập nhật kho thành công!');
    return true;
  } catch (error) {
    console.error('Lỗi cập nhật kho:', error);
    return false;
  }
};

// ======================= SEED DATABASE =======================

export const seedDatabase = async () => {
  try {
    const dummyData = [
      {
        name: 'Bình Gốm Lục Bình Hoa',
        price: 350000,
        imageUrl: 'https://picsum.photos/200/300?random=1',
        rating: 4.8,
        category: 'ceramics',
        quantity: 50,
        description:
          'Lục bình gốm sứ nung 1300 độ C, vẽ tay nghệ nhân Bát Tràng.',
      },
      {
        name: 'Thảm Dệt Sợi Mây Tre',
        price: 180000,
        imageUrl: 'https://picsum.photos/200/300?random=2',
        rating: 4.5,
        category: 'weaving',
        quantity: 30,
        description: 'Thảm từ 100% mây tre tự nhiên, thân thiện môi trường.',
      },
    ];

    const batch = writeBatch(db);
    dummyData.forEach(item => {
      const newDocRef = doc(collection(db, 'products'));
      batch.set(newDocRef, item);
    });

    await batch.commit();
    console.log('✅ Đã nạp dữ liệu mẫu');
    return true;
  } catch (error) {
    console.error('❌ Lỗi nạp dữ liệu:', error);
    return false;
  }
};

export const updateAllProductsQuantity = async (
  defaultQuantity: number = 50,
) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const batch = writeBatch(db);

    querySnapshot.docs.forEach(docSnapshot => {
      const docRef = doc(db, 'products', docSnapshot.id);
      batch.update(docRef, { quantity: defaultQuantity });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('❌ Lỗi cập nhật số lượng:', error);
    return false;
  }
};

export const addProductToFirestore = async (productData: any) => {
  try {
    await addDoc(collection(db, 'products'), {
      ...productData,
      rating: 5.0,
    });
    return true;
  } catch (error) {
    console.error('❌ Lỗi thêm sản phẩm:', error);
    return false;
  }
};
