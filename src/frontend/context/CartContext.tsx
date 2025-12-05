import React, { createContext, useContext, useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Định nghĩa kiểu dữ liệu sản phẩm trong giỏ
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: any;
  quantity: number;
  category?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: any) => void;
  decreaseQuantity: (itemId: string) => void; // Hàm giảm số lượng
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // 1. LẮNG NGHE ĐĂNG NHẬP ĐỂ TẢI GIỎ HÀNG VỀ
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (user) {
        // Nếu user đã đăng nhập, tải giỏ hàng từ Firestore về
        try {
          const cartDoc = await firestore()
            .collection('carts')
            .doc(user.uid)
            .get();
          if (cartDoc.exists()) {
            setCartItems(cartDoc.data()?.items || []);
            console.log('Đã đồng bộ giỏ hàng từ Firebase!');
          } else {
            setCartItems([]);
          }
        } catch (error) {
          console.error('Lỗi tải giỏ hàng:', error);
        }
      } else {
        // Nếu logout, xóa giỏ hàng trên màn hình
        setCartItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // HÀM PHỤ: LƯU LÊN FIREBASE (Dùng chung cho Add/Remove/Update)
  const syncToFirebase = async (newCartItems: CartItem[]) => {
    const user = auth().currentUser;
    if (user) {
      try {
        await firestore().collection('carts').doc(user.uid).set({
          items: newCartItems,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error('Lỗi lưu Firebase:', error);
      }
    }
  };

  // 2. THÊM SẢN PHẨM (Đã sửa để lưu Firebase)
  const addToCart = (product: any) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      let newCart;

      if (existingItem) {
        newCart = prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        newCart = [...prevItems, { ...product, quantity: 1 }];
      }

      syncToFirebase(newCart); // Lưu ngay
      return newCart;
    });
  };

  // 3. GIẢM SỐ LƯỢNG (Mới thêm)
  const decreaseQuantity = (itemId: string) => {
    setCartItems(prevItems => {
      const newCart = prevItems.map(item => {
        if (item.id === itemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
      syncToFirebase(newCart); // Lưu ngay
      return newCart;
    });
  };

  // 4. XÓA SẢN PHẨM
  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => {
      const newCart = prevItems.filter(item => item.id !== itemId);
      syncToFirebase(newCart); // Lưu ngay
      return newCart;
    });
  };

  // 5. XÓA SẠCH (SAU KHI MUA)
  const clearCart = () => {
    setCartItems([]);
    const user = auth().currentUser;
    if (user) {
      firestore().collection('carts').doc(user.uid).delete();
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
