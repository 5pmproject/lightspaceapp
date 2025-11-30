/**
 * 주문 서비스
 * 개선 사항:
 * - 비즈니스 로직 검증 (재고, 가격, 중복 주문)
 * - 통일된 에러 핸들링
 * - 타입 안정성 강화
 */

import { supabase } from '../lib/supabase';
import {
  Order,
  OrderInsert,
  OrderItemInsert,
  CartItem,
  CustomerInfo,
} from '../types/database.types';
import {
  ServiceResult,
  createSuccess,
  createError,
  ErrorCode,
} from '../types/service.types';
import { customersService } from './customers.service';
import { productsService } from './products.service';

// 비즈니스 규칙 상수
const BUSINESS_RULES = {
  MIN_ORDER_AMOUNT: 10000, // 최소 주문 금액 (원)
  MAX_ORDER_AMOUNT: 10000000, // 최대 주문 금액 (원)
  MAX_ITEMS_PER_ORDER: 50, // 주문당 최대 상품 종류
  DUPLICATE_ORDER_CHECK_MINUTES: 5, // 중복 주문 체크 시간 (분)
};

export const ordersService = {
  /**
   * 재고 검증
   */
  async validateStock(cartItems: CartItem[]): Promise<void> {
    const productIds = cartItems.map((item) => String(item.id));
    const stockResult = await productsService.checkStock(productIds);

    if (stockResult.error) {
      throw new Error('재고 확인에 실패했습니다');
    }

    const stockMap = stockResult.data;

    for (const item of cartItems) {
      const availableStock = stockMap.get(String(item.id)) || 0;
      if (availableStock < item.quantity) {
        throw new Error(
          `${item.name}의 재고가 부족합니다. (요청: ${item.quantity}, 재고: ${availableStock})`
        );
      }
    }
  },

  /**
   * 가격 검증 (클라이언트 조작 방지)
   */
  async validatePrices(cartItems: CartItem[]): Promise<void> {
    const productIds = cartItems.map((item) => String(item.id));
    const priceResult = await productsService.fetchProductPrices(productIds);

    if (priceResult.error) {
      throw new Error('가격 정보 확인에 실패했습니다');
    }

    const priceMap = priceResult.data;

    for (const item of cartItems) {
      const actualPrice = priceMap.get(String(item.id));
      if (actualPrice === undefined) {
        throw new Error(`${item.name}의 가격 정보를 찾을 수 없습니다`);
      }

      // 가격 차이가 1원 이상인 경우 (부동소수점 오차 고려)
      if (Math.abs(actualPrice - item.priceValue) > 0.01) {
        throw new Error(
          `${item.name}의 가격이 변경되었습니다. 장바구니를 새로고침해주세요.`
        );
      }
    }
  },

  /**
   * 주문 금액 검증
   */
  validateOrderAmount(totalAmount: number): void {
    if (totalAmount < BUSINESS_RULES.MIN_ORDER_AMOUNT) {
      throw new Error(
        `최소 주문 금액은 ${BUSINESS_RULES.MIN_ORDER_AMOUNT.toLocaleString()}원입니다`
      );
    }

    if (totalAmount > BUSINESS_RULES.MAX_ORDER_AMOUNT) {
      throw new Error(
        `최대 주문 금액은 ${BUSINESS_RULES.MAX_ORDER_AMOUNT.toLocaleString()}원입니다`
      );
    }
  },

  /**
   * 주문 항목 수 검증
   */
  validateCartItems(cartItems: CartItem[]): void {
    if (cartItems.length === 0) {
      throw new Error('주문할 상품이 없습니다');
    }

    if (cartItems.length > BUSINESS_RULES.MAX_ITEMS_PER_ORDER) {
      throw new Error(
        `한 번에 최대 ${BUSINESS_RULES.MAX_ITEMS_PER_ORDER}종류의 상품만 주문할 수 있습니다`
      );
    }

    // 수량 검증
    for (const item of cartItems) {
      if (item.quantity <= 0) {
        throw new Error(`${item.name}의 수량이 올바르지 않습니다`);
      }
      if (item.quantity > 999) {
        throw new Error(`${item.name}의 수량은 최대 999개까지 가능합니다`);
      }
    }
  },

  /**
   * 중복 주문 체크 (같은 고객이 짧은 시간 내에 같은 주문)
   */
  async checkDuplicateOrder(
    customerInfo: CustomerInfo,
    cartItems: CartItem[]
  ): Promise<void> {
    // 최근 5분 내 동일한 금액의 주문 확인
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.priceValue * item.quantity,
      0
    );

    const checkTime = new Date();
    checkTime.setMinutes(
      checkTime.getMinutes() - BUSINESS_RULES.DUPLICATE_ORDER_CHECK_MINUTES
    );

    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('total_amount', totalAmount)
      .gte('created_at', checkTime.toISOString())
      .limit(1);

    if (error) {
      // 중복 체크 실패는 주문을 막지 않음 (로그만 남김)
      console.warn('Duplicate order check failed:', error);
      return;
    }

    if (data && data.length > 0) {
      throw new Error(
        '동일한 주문이 최근에 이미 생성되었습니다. 잠시 후 다시 시도해주세요.'
      );
    }
  },

  /**
   * 주문 생성
   */
  async createOrder(
    customerInfo: CustomerInfo,
    cartItems: CartItem[]
  ): Promise<ServiceResult<Order>> {
    try {
      // 1. 입력값 기본 검증
      this.validateCartItems(cartItems);

      // 2. 총 금액 계산
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.priceValue * item.quantity,
        0
      );

      // 3. 주문 금액 검증
      this.validateOrderAmount(totalAmount);

      // 4. 비즈니스 로직 검증
      await this.validateStock(cartItems);
      await this.validatePrices(cartItems);
      await this.checkDuplicateOrder(customerInfo, cartItems);

      // 5. 고객 정보 생성
      const customerResult = await customersService.createCustomer(customerInfo);
      if (customerResult.error) {
        return createError(
          '고객 정보 저장에 실패했습니다',
          ErrorCode.DATABASE_ERROR,
          customerResult.error
        );
      }
      const customer = customerResult.data;

      // 6. 주문 생성
      const orderData: OrderInsert = {
        customer_id: customer.id,
        total_amount: totalAmount,
        status: 'pending',
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return createError(
          '주문 생성에 실패했습니다',
          ErrorCode.DATABASE_ERROR,
          orderError
        );
      }

      // 7. 주문 항목 생성
      const orderItemsData: OrderItemInsert[] = cartItems.map((item) => ({
        order_id: order.id,
        product_id: String(item.id),
        quantity: item.quantity,
        price: item.priceValue,
        product_snapshot: {
          name: item.name,
          image: item.image,
          price: item.priceValue,
        },
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        
        // 주문 항목 생성 실패 시 주문 취소
        await this.updateOrderStatus(order.id, 'cancelled');
        
        return createError(
          '주문 항목 생성에 실패했습니다',
          ErrorCode.DATABASE_ERROR,
          itemsError
        );
      }

      return createSuccess(order);
    } catch (error) {
      console.error('Error in createOrder:', error);

      if (error instanceof Error) {
        // 비즈니스 로직 에러
        if (
          error.message.includes('재고') ||
          error.message.includes('가격') ||
          error.message.includes('중복')
        ) {
          return createError(
            error.message,
            ErrorCode.VALIDATION_ERROR,
            error
          );
        }
      }

      return createError(
        '주문 생성 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 주문 조회 (ID로)
   */
  async fetchOrderById(orderId: string): Promise<ServiceResult<Order>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);

        if (error.code === 'PGRST116') {
          return createError(
            '주문 정보를 찾을 수 없습니다',
            ErrorCode.NOT_FOUND,
            error
          );
        }

        return createError(
          '주문 조회 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in fetchOrderById:', error);
      return createError(
        '주문 조회 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 주문 상태 업데이트
   */
  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'processing' | 'completed' | 'cancelled'
  ): Promise<ServiceResult<Order>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order status:', error);

        if (error.code === 'PGRST116') {
          return createError(
            '주문 정보를 찾을 수 없습니다',
            ErrorCode.NOT_FOUND,
            error
          );
        }

        return createError(
          '주문 상태 업데이트 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in updateOrderStatus:', error);
      return createError(
        '주문 상태 업데이트 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },
};



