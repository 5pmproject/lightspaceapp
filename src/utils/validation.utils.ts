/**
 * 입력값 검증 및 정제 유틸리티
 * 출처: OWASP Input Validation Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

import { ServiceError, ErrorCode } from '../types/service.types';

export class ValidationUtils {
  /**
   * 검색어 정제 (SQL Injection 방지)
   */
  static sanitizeSearchTerm(searchTerm: string): string {
    // 특수문자 이스케이프 및 공백 제거
    return searchTerm
      .replace(/[%_\\]/g, '\\$&')
      .trim()
      .slice(0, 100); // 최대 길이 제한
  }

  /**
   * 검색어 유효성 검증
   */
  static validateSearchTerm(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ServiceError(
        '검색어는 최소 2글자 이상이어야 합니다',
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (searchTerm.length > 100) {
      throw new ServiceError(
        '검색어는 최대 100글자까지 가능합니다',
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * 이메일 유효성 검증
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 전화번호 유효성 검증 (한국 형식)
   */
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 우편번호 유효성 검증
   */
  static validateZipCode(zipCode: string): boolean {
    // 5자리 또는 5자리-4자리 형식
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  }

  /**
   * 양수 검증
   */
  static validatePositiveNumber(value: number, fieldName: string): void {
    if (value <= 0) {
      throw new ServiceError(
        `${fieldName}은(는) 0보다 커야 합니다`,
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * 문자열 길이 검증
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    min: number,
    max: number
  ): void {
    if (value.length < min || value.length > max) {
      throw new ServiceError(
        `${fieldName}은(는) ${min}자 이상 ${max}자 이하여야 합니다`,
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * 필수 필드 검증
   */
  static validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ServiceError(
        `${fieldName}은(는) 필수 항목입니다`,
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * UUID 형식 검증
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}



