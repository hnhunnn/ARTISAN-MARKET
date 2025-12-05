// File: src/types/navigation.ts

import { StackNavigationProp } from '@react-navigation/stack';

// 1. Định nghĩa kiểu dữ liệu cơ bản cho CartItem
export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  // Thêm các trường khác nếu có, ví dụ: image: string;
}

// 2. Định nghĩa RootStackParamList
// Liệt kê tất cả các màn hình và tham số chúng nhận.
export type RootStackParamList = {
  Home: undefined; // Không nhận tham số
  Cart: undefined; // Không nhận tham số
  // Màn hình Checkout nhận 2 tham số đã được định nghĩa
  Checkout: {
    items: CartItem[];
    total: number;
  };
  // Thêm các màn hình khác của bạn vào đây (ví dụ: OrderConfirmation: { orderId: string; })
};

// 3. Định nghĩa kiểu Navigation Prop (để sử dụng trong useNavigation)
// Điều này giúp TypeScript hiểu rõ navigation có thể làm gì
export type AppStackNavigationProp = StackNavigationProp<RootStackParamList>;
