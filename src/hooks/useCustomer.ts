import { useState, useCallback } from 'react';
import { Customer, CustomerInfo } from '../types/database.types';
import { customersService } from '../services/customers.service';

interface UseCustomerReturn {
  customer: Customer | null;
  loading: boolean;
  error: string | null;
  createCustomer: (customerInfo: CustomerInfo) => Promise<string | null>;
  fetchCustomer: (customerId: string) => Promise<void>;
  updateCustomer: (customerId: string, customerInfo: Partial<CustomerInfo>) => Promise<boolean>;
  clearError: () => void;
}

export function useCustomer(): UseCustomerReturn {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCallback(async (
    customerInfo: CustomerInfo
  ): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await customersService.createCustomer(customerInfo);
      
      if (result.error) {
        setError(result.error.message);
        return null;
      }
      
      setCustomer(result.data);
      return result.data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '고객 정보 생성에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomer = useCallback(async (customerId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await customersService.fetchCustomerById(customerId);
      
      if (result.error) {
        setError(result.error.message);
        setCustomer(null);
      } else {
        setCustomer(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 정보를 불러오는데 실패했습니다.');
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (
    customerId: string,
    customerInfo: Partial<CustomerInfo>
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await customersService.updateCustomer(customerId, customerInfo);
      
      if (result.error) {
        setError(result.error.message);
        return false;
      }
      
      setCustomer(result.data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 정보 업데이트에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    customer,
    loading,
    error,
    createCustomer,
    fetchCustomer,
    updateCustomer,
    clearError,
  };
}



