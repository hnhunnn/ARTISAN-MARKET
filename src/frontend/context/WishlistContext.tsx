import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import auth from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../backend/firebaseConfig'; // Đảm bảo đường dẫn đúng
import { Product } from '../../backend/productService';

interface WishlistContextType {
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const user = auth().currentUser;

  // 1. Tải danh sách yêu thích từ Firebase khi vào App
  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) {
        setWishlist([]);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Nếu trên Firebase có trường 'wishlist', lưu vào state
          // Lưu ý: Để đơn giản, ở đây ta lưu cả object Product.
          // Thực tế tối ưu hơn là chỉ lưu ID rồi fetch lại, nhưng cách này nhanh nhất cho bạn học.
          if (userData.wishlist) {
            setWishlist(userData.wishlist);
          }
        }
      } catch (error) {
        console.error('Lỗi tải wishlist:', error);
      }
    };

    loadWishlist();
  }, [user]); // Chạy lại khi user thay đổi (đăng nhập/đăng xuất)

  // 2. Hàm xử lý Thêm/Xóa và ĐỒNG BỘ LÊN FIREBASE
  const toggleWishlist = async (product: Product) => {
    const isExisting = wishlist.some(item => item.id === product.id);
    let newWishlist = [];

    // Cập nhật giao diện ngay lập tức (Optimistic UI)
    if (isExisting) {
      newWishlist = wishlist.filter(item => item.id !== product.id);
    } else {
      newWishlist = [...wishlist, product];
    }
    setWishlist(newWishlist);

    // Cập nhật lên Firebase (Chạy ngầm)
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        if (isExisting) {
          // ⚠️ ĐOẠN LƯU TRỮ FIREBASE: Xóa khỏi mảng wishlist
          await updateDoc(userRef, {
            wishlist: arrayRemove(product),
          });
        } else {
          // ⚠️ ĐOẠN LƯU TRỮ FIREBASE: Thêm vào mảng wishlist
          await updateDoc(userRef, {
            wishlist: arrayUnion(product),
          });
        }
      } catch (error) {
        console.error('Lỗi đồng bộ Firebase:', error);
      }
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.id === productId);
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, toggleWishlist, isInWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
