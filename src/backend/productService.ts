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
  // Import Firestore fieldPath để truy vấn theo ID
  FieldPath,
  // Import các hàm cần thiết cho Modular V9
  updateDoc,
  increment,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import auth from '@react-native-firebase/auth';
// LƯU Ý: ĐÃ LOẠI BỎ IMPORT firestore DƯ THỪA ĐỂ TRÁNH TRÙNG LẶP SDK

// ======================= ORDER =======================

export const createOrder = async (orderData: {
  userId: string;
  customerName: string;
  phone: string;
  address: string;
  totalPrice: number;
  items: any[];
}) => {
  try {
    // Dùng Modular V9: addDoc(collection(db, 'orders'), ...)
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
  discount?: number; // Đã thêm trường discount
}

export const fetchProductsFromFirestore = async (
  categoryId: string = 'all',
): Promise<Product[]> => {
  try {
    const productsCollection = collection(db, 'products');
    let productsQuery: any;

    if (categoryId && categoryId !== 'all') {
      productsQuery = query(
        productsCollection,
        where('category', '==', categoryId),
      );
    } else {
      productsQuery = query(productsCollection);
    }

    const productSnapshot = (await getDocs(
      productsQuery,
    )) as QuerySnapshot<DocumentData>;
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
        discount: data.discount || 0, // Lấy giá trị discount
      };
    });

    return productsList;
  } catch (error) {
    console.error('❌ Lỗi lấy sản phẩm:', error);
    return [];
  }
};

// --- [PHẦN GIỮ NGUYÊN THEO YÊU CẦU] Lấy thông tin chi tiết của sản phẩm theo danh sách IDs ---
// *Lưu ý: Hàm này vẫn sử dụng firestore() cũ để giữ nguyên logic truy vấn trước đó.*
import firestore from '@react-native-firebase/firestore';
export const fetchProductsByIds = async (ids: string[]): Promise<Product[]> => {
  if (ids.length === 0) {
    return [];
  }

  // Lưu ý: Firestore chỉ cho phép tối đa 10 phần tử trong truy vấn 'in'
  if (ids.length > 10) {
    console.warn(
      'CẢNH BÁO: IDs list quá dài (>10), chỉ truy vấn 10 ID đầu tiên.',
    );
    ids = ids.slice(0, 10);
  }

  try {
    // Tạo truy vấn sử dụng firestore() Native SDK
    const productsRef = firestore().collection('products');
    const snapshot = await productsRef
      .where(firestore.FieldPath.documentId(), 'in', ids)
      .get();

    const products: Product[] = snapshot.docs.map(doc => {
      const data = doc.data() as Omit<Product, 'id'>;
      return {
        id: doc.id,
        ...data,
        discount: data.discount || 0, // Đảm bảo lấy discount
      } as Product;
    });

    // Sắp xếp lại kết quả theo thứ tự IDs nhận từ API AI
    const sortedProducts = ids
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined);

    return sortedProducts;
  } catch (error) {
    console.error('Lỗi khi fetch sản phẩm theo IDs:', error);
    return [];
  }
};

// ======================= USER =======================

export const getUserInfo = async (uid: string) => {
  // Dùng UID đã truyền từ HomeScreen
  try {
    // Dùng Modular V9: doc(db, 'users', uid)
    const userDocRef = doc(db, 'users', uid);
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

// --- Hàm trừ số lượng tồn kho sau khi mua ---
export const reduceStockAfterPurchase = async (cartItems: any[]) => {
  try {
    const batch = writeBatch(db); // Dùng Modular V9

    cartItems.forEach(item => {
      const productRef = doc(db, 'products', item.id); // Dùng Modular V9

      // Dùng Modular V9: increment(-soluong)
      batch.update(productRef, {
        quantity: increment(-item.quantity),
      });
    });

    await batch.commit();
    console.log('Đã cập nhật kho thành công!');
    return true;
  } catch (error) {
    console.error('Lỗi cập nhật kho:', error);
    return false;
  }
};

// ======================= UTILITY & SEED =======================

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
        discount: 10,
      },
      {
        name: 'Thảm Dệt Sợi Mây Tre',
        price: 180000,
        imageUrl: 'https://picsum.photos/200/300?random=2',
        rating: 4.5,
        category: 'weaving',
        quantity: 30,
        description: 'Thảm từ 100% mây tre tự nhiên, thân thiện môi trường.',
        discount: 0,
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
      discount: productData.discount ?? 0,
    });
    return true;
  } catch (error) {
    console.error('❌ Lỗi thêm sản phẩm:', error);
    return false;
  }
};
