// src/types/database.types.ts

// ============================================================================
// 공통 타입 정의
// ============================================================================
type UUID = string;
type Timestamp = string;
type ProductId = number;

// ============================================================================
// 데이터베이스 스키마 타입 (snake_case)
// PostgreSQL 컬럼명과 일치
// ============================================================================

export interface Product {
  id: ProductId;
  name: string;
  price: number;              // cents 단위 (15000 = 150.00원)
  farm: string;
  images: string[];
  description: string;
  location: string;
  dietary: string[];
  is_favorite: boolean;       // DB 기본값: false
  created_at: Timestamp;      // DB 자동 생성
}

export interface Customer {
  id: UUID;
  full_name: string;
  zip_code: string;
  address: string;
  detailed_address: string;
  city: string | null;
  country: string | null;
  state: string | null;
  created_at: Timestamp;
}

export interface Order {
  id: UUID;
  customer_id: UUID;
  total_amount: number;       // cents 단위
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: Timestamp;
}

export interface OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: ProductId;
  quantity: number;
  price: number;              // 주문 당시 가격 (cents)
  created_at: Timestamp;
}

// ============================================================================
// Insert/Update 타입
// Supabase 권장 패턴: Row/Insert/Update 분리
// 출처: https://supabase.com/docs/guides/api/generating-types
// ============================================================================

export type ProductInsert = Omit<Product, 'id' | 'created_at'> & {
  is_favorite?: boolean;      // INSERT 시 선택적
};

export type ProductUpdate = Partial<ProductInsert>;

export type CustomerInsert = Omit<Customer, 'id' | 'created_at'>;

export type CustomerUpdate = Partial<CustomerInsert>;

export type OrderInsert = Omit<Order, 'id' | 'created_at'>;

export type OrderUpdate = Partial<Pick<Order, 'status'>>;

export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'>;

export type OrderItemUpdate = Partial<Pick<OrderItem, 'quantity'>>;

// ============================================================================
// Supabase Database 타입 정의
// ============================================================================

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      orders: {
        Row: Order;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      order_items: {
        Row: OrderItem;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
      };
    };
  };
}

// ============================================================================
// 조회 최적화 타입 (JOIN 결과용)
// ============================================================================

// 주문 목록용 - 최소 정보만
export interface OrderSummary {
  id: UUID;
  total_amount: number;
  status: Order['status'];
  created_at: Timestamp;
  customer_name: string;      // customers.full_name JOIN
  item_count: number;         // COUNT(*) 집계
}

// 주문 상세용 - 필요한 필드만 선택
export interface OrderDetail extends Order {
  customer: Pick<Customer, 'id' | 'full_name' | 'zip_code' | 'address' | 'detailed_address' | 'city' | 'state'>;
  items: Array<{
    id: UUID;
    quantity: number;
    price: number;
    product: Pick<Product, 'id' | 'name' | 'images' | 'farm'>;
  }>;
}

// 레거시 호환용 (OrderWithItems 대체)
export interface OrderWithItems extends Order {
  customer: Customer;
  items: Array<OrderItem & {
    product: Product;
  }>;
}

// ============================================================================
// 애플리케이션 레이어 타입 (camelCase)
// React 컴포넌트에서 사용
// ============================================================================

export interface ProductDisplay {
  id: ProductId;
  name: string;
  price: number;              // 원본 숫자
  formattedPrice: string;     // "15,000원" 표시용
  priceValue: number;         // 호환성 유지 (price와 동일)
  farm: string;
  image: string;              // images[0]
  images: string[];
  isFavorite: boolean;
  description: string;
  location: string;
  dietary: string[];
}

export interface CartItem {
  id: ProductId;
  name: string;
  price: string;              // 레거시 호환 ("15,000원")
  priceValue: number;         // 계산용 숫자
  image: string;
  quantity: number;
}

export interface CustomerInfo {
  fullName: string;
  zipCode: string;
  address: string;
  detailedAddress: string;
  city?: string;
  country?: string;
  state?: string;
}

// ============================================================================
// 타입 변환 유틸리티
// DB 타입 ↔ App 타입 변환을 한 곳에서 관리
// ============================================================================

export const formatPrice = (cents: number): string => {
  return `${(cents / 100).toLocaleString('ko-KR')}원`;
};

export const parsePriceString = (priceStr: string): number => {
  // "15,000원" → 1500000 (cents)
  const numericStr = priceStr.replace(/[^0-9]/g, '');
  return parseInt(numericStr, 10) * 100;
};

// Product (DB) → ProductDisplay (App)
export const toProductDisplay = (product: Product): ProductDisplay => ({
  id: product.id,
  name: product.name,
  price: product.price,
  formattedPrice: formatPrice(product.price),
  priceValue: product.price,
  farm: product.farm,
  image: product.images[0] || '',
  images: product.images,
  isFavorite: product.is_favorite,
  description: product.description,
  location: product.location,
  dietary: product.dietary,
});

// ProductDisplay (App) → CartItem
export const toCartItem = (product: ProductDisplay, quantity: number = 1): CartItem => ({
  id: product.id,
  name: product.name,
  price: product.formattedPrice,
  priceValue: product.price,
  image: product.image,
  quantity,
});

// Customer (DB) → CustomerInfo (App)
export const toCustomerInfo = (customer: Customer): CustomerInfo => ({
  fullName: customer.full_name,
  zipCode: customer.zip_code,
  address: customer.address,
  detailedAddress: customer.detailed_address,
  city: customer.city ?? undefined,
  country: customer.country ?? undefined,
  state: customer.state ?? undefined,
});

// CustomerInfo (App) → CustomerInsert (DB)
export const toCustomerInsert = (info: CustomerInfo): CustomerInsert => ({
  full_name: info.fullName,
  zip_code: info.zipCode,
  address: info.address,
  detailed_address: info.detailedAddress,
  city: info.city ?? null,
  country: info.country ?? null,
  state: info.state ?? null,
});

// CartItem (App) → OrderItemInsert (DB)
export const toOrderItemInsert = (
  orderId: UUID,
  cartItem: CartItem
): OrderItemInsert => ({
  order_id: orderId,
  product_id: cartItem.id,
  quantity: cartItem.quantity,
  price: cartItem.priceValue,  // 주문 당시 가격 저장
});

// ============================================================================
// 타입 가드
// ============================================================================

export const isValidOrderStatus = (status: string): status is Order['status'] => {
  return ['pending', 'processing', 'completed', 'cancelled'].includes(status);
};

export const isUUID = (value: string): value is UUID => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

