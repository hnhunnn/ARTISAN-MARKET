// src/navigation/types.ts

// Định nghĩa lại CartItem (lấy từ CartContext.tsx)
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: any;
  quantity: number;
}

// Giả định kiểu Product (chỉ cần các trường cơ bản)
export interface Product {
  id: string;
  name: string;
  price: number;
  // Thêm các trường khác cần thiết cho ProductDetail (imageUrl, category, rating, description)
  imageUrl: string;
  category: string;
  rating: number;
  description: string;
  // Bổ sung các trường có thể bị thiếu
}


// Định nghĩa danh sách Routes và tham số (Param List)
export type RootStackParamList = {
  Home: undefined;
  Cart: undefined;
  Wishlist: undefined;
  Login: undefined;
  Register: undefined;
  // ProductDetail nhận tham số product
  ProductDetail: { product: Product }; 
  // Checkout được định nghĩa để nhận 2 tham số này (KHẮC PHỤC LỖI TS2345)
  Checkout: { cartItems: CartItem[]; totalAmount: number }; 
};