/**
 * 제품 서비스
 * 개선 사항:
 * - 통일된 에러 핸들링 (ServiceResult 패턴)
 * - 입력값 검증 및 정제
 * - 타입 안정성 강화
 */

import { supabase } from '../lib/supabase';
import { Product } from '../types/database.types';
import {
  ServiceResult,
  createSuccess,
  createError,
  ErrorCode,
} from '../types/service.types';
import { ValidationUtils } from '../utils/validation.utils';

export const productsService = {
  /**
   * 모든 제품 가져오기
   * 출처: https://supabase.com/docs/reference/javascript/select
   */
  async fetchProducts(): Promise<ServiceResult<Product[]>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return createError(
          '제품 목록을 불러올 수 없습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data || []);
    } catch (error) {
      console.error('Unexpected error in fetchProducts:', error);
      return createError(
        '제품 목록 조회 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 특정 제품 가져오기
   */
  async fetchProductById(id: string): Promise<ServiceResult<Product>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        
        // 404 에러 구분
        if (error.code === 'PGRST116') {
          return createError(
            `ID ${id}에 해당하는 제품을 찾을 수 없습니다`,
            ErrorCode.NOT_FOUND,
            error
          );
        }

        return createError(
          '제품 정보를 불러올 수 없습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in fetchProductById:', error);
      
      if (error instanceof Error && error.name === 'ServiceError') {
        return createError(error.message, ErrorCode.VALIDATION_ERROR, error);
      }

      return createError(
        '제품 조회 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 제품 검색
   * SQL Injection 방지 및 입력값 검증 적용
   * 출처: OWASP Input Validation Cheat Sheet
   */
  async searchProducts(searchTerm: string): Promise<ServiceResult<Product[]>> {
    try {
      // 입력값 검증
      ValidationUtils.validateSearchTerm(searchTerm);

      // 검색어 정제
      const sanitizedTerm = ValidationUtils.sanitizeSearchTerm(searchTerm);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${sanitizedTerm}%`)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error searching products:', error);
        return createError(
          '제품 검색 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data || []);
    } catch (error) {
      console.error('Unexpected error in searchProducts:', error);

      if (error instanceof Error && error.name === 'ServiceError') {
        return createError(error.message, ErrorCode.VALIDATION_ERROR, error);
      }

      return createError(
        '제품 검색 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 여러 제품의 재고 확인 (주문 생성 시 사용)
   */
  async checkStock(
    productIds: string[]
  ): Promise<ServiceResult<Map<string, number>>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .in('id', productIds);

      if (error) {
        console.error('Error checking stock:', error);
        return createError(
          '재고 확인 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      // Map으로 변환 (빠른 조회를 위해)
      const stockMap = new Map<string, number>();
      data?.forEach((product) => {
        stockMap.set(product.id, product.stock_quantity || 0);
      });

      return createSuccess(stockMap);
    } catch (error) {
      console.error('Unexpected error in checkStock:', error);
      return createError(
        '재고 확인 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 제품 가격 조회 (가격 검증용)
   */
  async fetchProductPrices(
    productIds: string[]
  ): Promise<ServiceResult<Map<string, number>>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      if (error) {
        console.error('Error fetching prices:', error);
        return createError(
          '가격 정보 조회 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      const priceMap = new Map<string, number>();
      data?.forEach((product) => {
        priceMap.set(product.id, product.price);
      });

      return createSuccess(priceMap);
    } catch (error) {
      console.error('Unexpected error in fetchProductPrices:', error);
      return createError(
        '가격 조회 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },
};



