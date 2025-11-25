/**
 * Supabase 데이터베이스 함수 (RPC)
 * 트랜잭션 처리를 위한 PostgreSQL 함수
 * 
 * 출처: https://supabase.com/docs/guides/database/functions
 * 
 * 이 파일을 Supabase SQL Editor에서 실행하세요.
 */

-- 1. 재고 차감 함수
CREATE OR REPLACE FUNCTION decrement_stock(
  product_id_param uuid,
  quantity_param integer
) RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - quantity_param,
      updated_at = now()
  WHERE id = product_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION '상품을 찾을 수 없습니다: %', product_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 재고 복구 함수 (주문 취소 시 사용)
CREATE OR REPLACE FUNCTION restore_stock(
  order_id_param uuid
) RETURNS void AS $$
BEGIN
  UPDATE products p
  SET stock_quantity = p.stock_quantity + oi.quantity,
      updated_at = now()
  FROM order_items oi
  WHERE oi.order_id = order_id_param
    AND oi.product_id::uuid = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 주문 취소 트랜잭션 함수
CREATE OR REPLACE FUNCTION cancel_order_transaction(
  order_id_param uuid
) RETURNS jsonb AS $$
DECLARE
  order_status text;
  result jsonb;
BEGIN
  -- 주문 상태 확인
  SELECT status INTO order_status
  FROM orders
  WHERE id = order_id_param
  FOR UPDATE;

  IF order_status IS NULL THEN
    RAISE EXCEPTION '주문을 찾을 수 없습니다';
  END IF;

  IF order_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION '이미 완료되었거나 취소된 주문입니다';
  END IF;

  -- 재고 복구
  PERFORM restore_stock(order_id_param);

  -- 주문 상태 업데이트
  UPDATE orders
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = order_id_param;

  result := jsonb_build_object(
    'order_id', order_id_param,
    'status', 'cancelled',
    'message', '주문이 취소되었습니다'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '주문 취소 실패: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 주문 통계 함수
CREATE OR REPLACE FUNCTION get_order_statistics(
  start_date timestamp DEFAULT NULL,
  end_date timestamp DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'average_order_value', COALESCE(AVG(total_amount), 0),
    'pending_orders', COUNT(*) FILTER (WHERE status = 'pending'),
    'completed_orders', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled')
  ) INTO result
  FROM orders
  WHERE (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
    AND deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 권한 설정
-- authenticated 역할(로그인한 사용자)에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION decrement_stock TO authenticated;
GRANT EXECUTE ON FUNCTION restore_stock TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_statistics TO authenticated;

-- anon(익명 사용자)에게도 필요한 함수 권한 부여 (비회원 주문용)
GRANT EXECUTE ON FUNCTION decrement_stock TO anon;
GRANT EXECUTE ON FUNCTION restore_stock TO anon;

-- 주석: 보안을 위해 통계 함수는 authenticated만 실행 가능

