import { useState, useCallback } from 'react';
import { Order, CartItem, CustomerInfo } from '../types/database.types';
import { ordersService } from '../services/orders.service';

interface UseOrderReturn {
  order: Order | null;
  loading: boolean;
  error: string | null;
  createOrder: (customerInfo: CustomerInfo, cartItems: CartItem[]) => Promise<string | null>;
  fetchOrder: (orderId: string) => Promise<void>;
  clearError: () => void;
}

export function useOrder(): UseOrderReturn {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (
    customerInfo: CustomerInfo,
    cartItems: CartItem[]
  ): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // ServiceResult 패턴 사용
      const result = await ordersService.createOrder(customerInfo, cartItems);
      
      if (result.error) {
        setError(result.error.message);
        return null;
      }
      
      setOrder(result.data);
      return result.data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주문 생성에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // ServiceResult 패턴 사용
      const result = await ordersService.fetchOrderById(orderId);
      
      if (result.error) {
        setError(result.error.message);
        setOrder(null);
      } else {
        setOrder(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문을 불러오는데 실패했습니다.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    order,
    loading,
    error,
    createOrder,
    fetchOrder,
    clearError,
  };
}

interface UseOrderStatusReturn {
  loading: boolean;
  error: string | null;
  updateStatus: (orderId: string, status: 'pending' | 'processing' | 'completed' | 'cancelled') => Promise<boolean>;
}

export function useOrderStatus(): UseOrderStatusReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async (
    orderId: string,
    status: 'pending' | 'processing' | 'completed' | 'cancelled'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ordersService.updateOrderStatus(orderId, status);
      
      if (result.error) {
        setError(result.error.message);
        return false;
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 업데이트에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    updateStatus,
  };
}



