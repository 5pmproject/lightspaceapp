/**
 * 고객 서비스
 * 개선 사항:
 * - any 타입 제거 및 타입 안정성 강화
 * - 입력값 검증 추가
 * - 통일된 에러 핸들링
 */

import { supabase } from '../lib/supabase';
import { Customer, CustomerInfo, CustomerInsert } from '../types/database.types';
import {
  ServiceResult,
  createSuccess,
  createError,
  ErrorCode,
} from '../types/service.types';
import { ValidationUtils } from '../utils/validation.utils';

export const customersService = {
  /**
   * 고객 정보 검증
   */
  validateCustomerInfo(customerInfo: CustomerInfo): void {
    ValidationUtils.validateRequired(customerInfo.fullName, '이름');
    ValidationUtils.validateRequired(customerInfo.zipCode, '우편번호');
    ValidationUtils.validateRequired(customerInfo.address, '주소');

    // 이름 길이 검증
    ValidationUtils.validateStringLength(customerInfo.fullName, '이름', 2, 100);

    // 우편번호 형식 검증
    if (!ValidationUtils.validateZipCode(customerInfo.zipCode)) {
      throw new Error('올바른 우편번호 형식이 아닙니다');
    }

    // 주소 길이 검증
    ValidationUtils.validateStringLength(customerInfo.address, '주소', 5, 200);
  },

  /**
   * 고객 정보 생성
   */
  async createCustomer(
    customerInfo: CustomerInfo
  ): Promise<ServiceResult<Customer>> {
    try {
      // 입력값 검증
      this.validateCustomerInfo(customerInfo);

      // 명확한 타입 사용
      const customerData: CustomerInsert = {
        full_name: customerInfo.fullName,
        zip_code: customerInfo.zipCode,
        address: customerInfo.address,
        detailed_address: customerInfo.detailedAddress,
        city: customerInfo.city ?? null,
        country: customerInfo.country ?? 'KR',
        state: customerInfo.state ?? null,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);

        // 중복 키 에러 처리
        if (error.code === '23505') {
          return createError(
            '이미 등록된 고객 정보입니다',
            ErrorCode.DUPLICATE_ENTRY,
            error
          );
        }

        return createError(
          '고객 정보 저장 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in createCustomer:', error);

      if (error instanceof Error && error.name === 'ServiceError') {
        return createError(error.message, ErrorCode.VALIDATION_ERROR, error);
      }

      return createError(
        '고객 정보 저장 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 고객 정보 조회
   */
  async fetchCustomerById(id: string): Promise<ServiceResult<Customer>> {
    try {
      // UUID 형식 검증
      if (!ValidationUtils.validateUUID(id)) {
        return createError(
          '올바르지 않은 고객 ID 형식입니다',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);

        if (error.code === 'PGRST116') {
          return createError(
            '고객 정보를 찾을 수 없습니다',
            ErrorCode.NOT_FOUND,
            error
          );
        }

        return createError(
          '고객 정보 조회 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in fetchCustomerById:', error);
      return createError(
        '고객 정보 조회 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },

  /**
   * 고객 정보 업데이트
   */
  async updateCustomer(
    id: string,
    customerInfo: Partial<CustomerInfo>
  ): Promise<ServiceResult<Customer>> {
    try {
      // UUID 형식 검증
      if (!ValidationUtils.validateUUID(id)) {
        return createError(
          '올바르지 않은 고객 ID 형식입니다',
          ErrorCode.VALIDATION_ERROR
        );
      }

      // 명확한 타입 사용
      const updateData: Partial<CustomerInsert> = {};

      if (customerInfo.fullName !== undefined) {
        ValidationUtils.validateStringLength(customerInfo.fullName, '이름', 2, 100);
        updateData.full_name = customerInfo.fullName;
      }
      if (customerInfo.zipCode !== undefined) {
        if (!ValidationUtils.validateZipCode(customerInfo.zipCode)) {
          return createError(
            '올바른 우편번호 형식이 아닙니다',
            ErrorCode.VALIDATION_ERROR
          );
        }
        updateData.zip_code = customerInfo.zipCode;
      }
      if (customerInfo.address !== undefined) {
        ValidationUtils.validateStringLength(customerInfo.address, '주소', 5, 200);
        updateData.address = customerInfo.address;
      }
      if (customerInfo.detailedAddress !== undefined) {
        updateData.detailed_address = customerInfo.detailedAddress;
      }
      if (customerInfo.city !== undefined) {
        updateData.city = customerInfo.city ?? null;
      }
      if (customerInfo.country !== undefined) {
        updateData.country = customerInfo.country ?? null;
      }
      if (customerInfo.state !== undefined) {
        updateData.state = customerInfo.state ?? null;
      }

      // 업데이트할 데이터가 없는 경우
      if (Object.keys(updateData).length === 0) {
        return createError(
          '업데이트할 정보가 없습니다',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);

        if (error.code === 'PGRST116') {
          return createError(
            '고객 정보를 찾을 수 없습니다',
            ErrorCode.NOT_FOUND,
            error
          );
        }

        return createError(
          '고객 정보 업데이트 중 오류가 발생했습니다',
          ErrorCode.DATABASE_ERROR,
          error
        );
      }

      return createSuccess(data);
    } catch (error) {
      console.error('Unexpected error in updateCustomer:', error);

      if (error instanceof Error && error.name === 'ServiceError') {
        return createError(error.message, ErrorCode.VALIDATION_ERROR, error);
      }

      return createError(
        '고객 정보 업데이트 중 오류가 발생했습니다',
        ErrorCode.UNKNOWN,
        error
      );
    }
  },
};



