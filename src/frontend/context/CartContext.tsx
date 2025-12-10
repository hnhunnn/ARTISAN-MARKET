import React, { createContext, useContext, useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Định nghĩa kiểu dữ liệu sản phẩm trong giỏ (ĐÃ THÊM discount VÀ isSelected)
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: any;
  quantity: number;
  category?: string;
  discount?: number;
  imageUrl?: string;
  isSelected?: boolean; // <--- TRƯỜNG MỚI: Trạng thái chọn mua
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: any) => void;
  decreaseQuantity: (itemId: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: (items?: CartItem[]) => number; // Hàm tính tổng tiền (có thể nhận danh sách lọc)
  toggleItemSelection: (itemId: string) => void; // <--- HÀM MỚI
  getSelectedItems: () => CartItem[]; // <--- HÀM MỚI
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // HÀM PHỤ: LƯU LÊN FIREBASE (Dùng chung cho Add/Remove/Update/Selection)
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

  // 1. LẮNG NGHE ĐĂNG NHẬP ĐỂ TẢI GIỎ HÀNG VỀ
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (user) {
        try {
          const cartDoc = await firestore()
            .collection('carts')
            .doc(user.uid)
            .get();
          if (cartDoc.exists()) {
            // Khi tải về, đảm bảo mọi item đều có trường isSelected (mặc định là true)
            const loadedItems = (
              (cartDoc.data()?.items as CartItem[]) || []
            ).map(item => ({
              ...item,
              isSelected:
                item.isSelected !== undefined ? item.isSelected : true,
            }));
            setCartItems(loadedItems);
            console.log('Đã đồng bộ giỏ hàng từ Firebase!');
          } else {
            setCartItems([]);
          }
        } catch (error) {
          console.error('Lỗi tải giỏ hàng:', error);
        }
      } else {
        setCartItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. THÊM SẢN PHẨM
  const addToCart = (product: any) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      let newCart;

      if (existingItem) {
        newCart = prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, isSelected: true } // Mặc định chọn khi thêm/tăng
            : item,
        );
      } else {
        newCart = [
          ...prevItems,
          {
            ...product,
            quantity: 1,
            discount: product.discount || 0,
            imageUrl: product.imageUrl || product.image,
            isSelected: true, // <<-- MẶC ĐỊNH LÀ TRUE
          },
        ];
      }

      syncToFirebase(newCart);
      return newCart;
    });
  };

  // 3. GIẢM SỐ LƯỢNG
  const decreaseQuantity = (itemId: string) => {
    setCartItems(prevItems => {
      const newCart = prevItems.map(item => {
        if (item.id === itemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
      syncToFirebase(newCart);
      return newCart;
    });
  };

  // 4. XÓA SẢN PHẨM
  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => {
      const newCart = prevItems.filter(item => item.id !== itemId);
      syncToFirebase(newCart);
      return newCart;
    });
  };

  // 5. [HÀM MỚI] BẬT/TẮT CHỌN SẢN PHẨM
  const toggleItemSelection = (itemId: string) => {
    setCartItems(prevItems => {
      const newCart = prevItems.map(item =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item,
      );
      syncToFirebase(newCart);
      return newCart;
    });
  };

  // 6. [HÀM MỚI] LẤY DANH SÁCH MỤC ĐÃ CHỌN
  const getSelectedItems = () => {
    return cartItems.filter(item => item.isSelected);
  };

  // 7. HÀM TÍNH TỔNG TIỀN (Chấp nhận danh sách items đã lọc)
  const getTotalPrice = (items: CartItem[] = cartItems) => {
    return items.reduce((total, item) => {
      const discountRate = item.discount ? item.discount / 100 : 0;
      const priceAfterDiscount = item.price * (1 - discountRate);

      return total + priceAfterDiscount * item.quantity;
    }, 0);
  };

  // 8. XÓA SẠCH (SAU KHI MUA)
  const clearCart = () => {
    // Sau khi thanh toán, chỉ xóa các items đã được chọn
    const remainingItems = cartItems.filter(item => !item.isSelected);
    setCartItems(remainingItems);
    syncToFirebase(remainingItems);

    // Nếu không còn item nào, xóa cả doc trên Firebase
    if (remainingItems.length === 0) {
      const user = auth().currentUser;
      if (user) {
        firestore().collection('carts').doc(user.uid).delete();
      }
    }
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
        toggleItemSelection, // <--- CUNG CẤP HÀM MỚI
        getSelectedItems, // <--- CUNG CẤP HÀM MỚI
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
