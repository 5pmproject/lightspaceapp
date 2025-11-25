-- ============================================================================
-- 개선된 E-Commerce 데이터베이스 스키마
-- 기반: Supabase + PostgreSQL
-- 참고: https://supabase.com/docs/guides/database
-- ============================================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Products Table (제품)
-- 변경사항:
-- - ID를 SERIAL에서 UUID로 변경 (일관성, 보안)
-- - price TEXT 제거, price만 NUMERIC으로 통일
-- - currency 컬럼 추가 (다국가 확장 대비)
-- - stock_quantity, is_active 추가 (재고 관리)
-- - dietary 배열 제거 (정규화 테이블로 분리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'KRW' NOT NULL,
  farm TEXT NOT NULL, -- 제조사/브랜드
  images TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  
  -- 재고 관리
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN DEFAULT true, -- 판매 활성화 여부
  
  -- 소프트 삭제
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 2. Product Attributes Table (제품 속성 - 정규화)
-- 용도: dietary, material 등 검색/필터링이 빈번한 속성 저장
-- 참고: https://www.postgresql.org/docs/current/ddl-constraints.html
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_type TEXT NOT NULL, -- 'dietary', 'material', 'style' 등
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- 중복 방지
  UNIQUE(product_id, attribute_type, attribute_value)
);

-- ============================================================================
-- 3. Customers Table (고객)
-- 변경사항:
-- - auth_user_id 추가 (Supabase Auth 연동)
-- - 소프트 삭제 추가
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Supabase Auth 연동
  -- 참고: https://supabase.com/docs/guides/auth/managing-user-data
  auth_user_id UUID UNIQUE, -- auth.users.id와 연결 (선택적)
  
  full_name TEXT NOT NULL,
  email TEXT, -- 추가: 주문 확인 메일용
  phone TEXT, -- 추가: 배송 연락용
  
  -- 주소 정보
  zip_code TEXT NOT NULL,
  address TEXT NOT NULL,
  detailed_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'KR',
  
  -- 소프트 삭제
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. Orders Table (주문)
-- 변경사항:
-- - 소프트 삭제 추가
-- - payment_status 추가 (주문 상태와 결제 상태 분리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, -- CASCADE 대신 RESTRICT
  
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  currency TEXT DEFAULT 'KRW' NOT NULL,
  
  -- 주문 상태
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- 결제 상태 (분리)
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  
  -- 메모
  order_notes TEXT,
  
  -- 소프트 삭제
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 5. Order Items Table (주문 상품)
-- 변경사항:
-- - product_snapshot 추가 (제품 정보가 변경되어도 주문 당시 정보 보존)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0), -- 주문 당시 가격
  currency TEXT DEFAULT 'KRW' NOT NULL,
  
  -- 주문 당시 제품 정보 스냅샷 (제품 삭제/변경 대비)
  product_snapshot JSONB, -- {name, farm, description 등}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 6. Order Status History (주문 상태 변경 이력)
-- 용도: 상태 변경 추적, 고객 서비스, 분석
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  
  -- 변경한 사람 (관리자 기능 추가 시 사용)
  changed_by UUID, -- auth.users.id 또는 NULL (시스템 자동)
  changed_reason TEXT, -- 변경 사유
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 7. 인덱스 (성능 최적화)
-- 참고: https://www.postgresql.org/docs/current/indexes-types.html
-- ============================================================================

-- Products 인덱스
CREATE INDEX idx_products_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_price ON products(price) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_products_favorite ON products(is_favorite) WHERE is_active = true AND deleted_at IS NULL;

-- Product Attributes 인덱스 (필터링 최적화)
CREATE INDEX idx_product_attributes_type_value ON product_attributes(attribute_type, attribute_value);
CREATE INDEX idx_product_attributes_product ON product_attributes(product_id);

-- Customers 인덱스
CREATE INDEX idx_customers_auth_user ON customers(auth_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;

-- Orders 인덱스 (복합 인덱스로 쿼리 최적화)
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;

-- Order Items 인덱스
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Order Status History 인덱스
CREATE INDEX idx_order_history_order ON order_status_history(order_id, created_at DESC);

-- ============================================================================
-- 8. Row Level Security (RLS) 정책
-- 참고: https://supabase.com/docs/guides/auth/row-level-security
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Products: 활성화된 제품만 공개 조회
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Product Attributes: 활성 제품의 속성만 조회
CREATE POLICY "Public can view active product attributes" ON product_attributes
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products 
      WHERE is_active = true AND deleted_at IS NULL
    )
  );

-- Customers: 본인 정보만 조회/수정
CREATE POLICY "Users can view own customer data" ON customers
  FOR SELECT USING (
    auth.uid() = auth_user_id OR 
    auth_user_id IS NULL -- 비회원 주문용 (세션 기반 처리 필요)
  );

CREATE POLICY "Users can insert customer data" ON customers
  FOR INSERT WITH CHECK (true); -- 회원가입/주문 시 생성 허용

CREATE POLICY "Users can update own customer data" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Orders: 본인 주문만 조회
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers 
      WHERE auth.uid() = auth_user_id OR auth_user_id IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (true); -- 주문 생성 허용

-- Order Items: 본인 주문의 상품만 조회
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_id IN (
        SELECT id FROM customers 
        WHERE auth.uid() = auth_user_id OR auth_user_id IS NULL
      )
    )
  );

CREATE POLICY "Users can create order items" ON order_items
  FOR INSERT WITH CHECK (true);

-- Order Status History: 본인 주문 이력만 조회
CREATE POLICY "Users can view own order history" ON order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_id IN (
        SELECT id FROM customers 
        WHERE auth.uid() = auth_user_id
      )
    )
  );

-- ============================================================================
-- 9. 트리거 (자동화)
-- ============================================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Products updated_at 트리거
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Customers updated_at 트리거
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Orders updated_at 트리거
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주문 상태 변경 이력 자동 기록
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_order_status_changes
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- ============================================================================
-- 10. 샘플 데이터 삽입
-- ============================================================================

-- 제품 데이터
INSERT INTO products (id, name, price, farm, images, description, location, stock_quantity) VALUES
  ('11111111-1111-1111-1111-111111111111', '스칸디나비아 펜던트 조명', 119000, '루미나 디자인',
   ARRAY['https://images.unsplash.com/photo-1540932239986-30128078f3c5', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15'],
   '자연스러운 우드 톤과 미니멀한 실루엣의 펜던트 조명.', '덴마크 코펜하겐, 루미나 디자인', 50),
  
  ('22222222-2222-2222-2222-222222222222', '모던 스틸 바 램프', 159000, '노드스틸',
   ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e'],
   '슬림한 직선형 바 조명.', '스웨덴 말뫼, 노드스틸', 30),
  
  ('33333333-3333-3333-3333-333333333333', '글로우볼 플로어 램프', 189000, '글로우 아틀리에',
   ARRAY['https://images.unsplash.com/photo-1638244398513-17b778d24efe?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc'],
   '오팔 글라스가 빛을 부드럽게 분산시켜주는 플로어 램프.', '독일 베를린, 글로우 아틀리에', 25),
  
  ('44444444-4444-4444-4444-444444444444', '아틀리에 인더스트리얼 벽등', 79000, '아이언웍스',
   ARRAY['https://images.unsplash.com/photo-1524484485831-a92ffc0de03f', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64'],
   '메탈 질감을 살린 카페풍 인더스트리얼 벽등.', '영국 맨체스터, 아이언웍스', 40),
  
  ('55555555-5555-5555-5555-555555555555', '미니멀 데스크 램프', 69000, '라이트랩',
   ARRAY['https://images.unsplash.com/photo-1756474215958-f0c2a31eddc1?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103'],
   '얇고 단정한 라인 디자인의 데스크 램프.', '일본 도쿄, 라이트랩', 60),
  
  ('66666666-6666-6666-6666-666666666666', '우드 프레임 스탠드 조명', 129000, '포레스트라이트',
   ARRAY['https://images.unsplash.com/photo-1543198126-a8ad8e47fb22', 'https://images.unsplash.com/photo-1489171078254-c3365d6e359f'],
   '원목 프레임이 따뜻한 분위기를 만드는 스탠드 조명.', '핀란드 헬싱키, 포레스트라이트', 35),
  
  ('77777777-7777-7777-7777-777777777777', '글라스 돔 테이블 램프', 89000, '돔라이트 스튜디오',
   ARRAY['https://cdn.pixabay.com/photo/2014/11/15/14/00/tiffany-531993_1280.jpg', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5'],
   '유리 돔 안의 빛이 은은하게 퍼지는 테이블 램프.', '프랑스 파리, 돔라이트 스튜디오', 45),
  
  ('88888888-8888-8888-8888-888888888888', '라인 아크 LED 천장등', 149000, '아크라이트',
   ARRAY['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64'],
   '부드러운 곡선 라인으로 공간을 정돈해주는 천장등.', '네덜란드 암스테르담, 아크라이트', 20),
  
  ('99999999-9999-9999-9999-999999999999', '노르딕 페이퍼쉐이드 램프', 59000, '페이퍼라이트',
   ARRAY['https://images.pexels.com/photos/34836270/pexels-photo-34836270.jpeg'],
   '종이 질감을 살린 북유럽풍 페이퍼램프.', '노르웨이 오슬로, 페이퍼라이트', 70),
  
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '아르코 글라스 펜던트', 139000, '아르코 라보라토리',
   ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5'],
   '반투명 글라스와 금속 라인의 조화가 아름다운 펜던트.', '이탈리아 밀라노, 아르코 라보라토리', 28)
ON CONFLICT (id) DO NOTHING;

-- 제품 속성 데이터
INSERT INTO product_attributes (product_id, attribute_type, attribute_value) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dietary', 'LED'),
  ('11111111-1111-1111-1111-111111111111', 'dietary', '미니멀'),
  ('11111111-1111-1111-1111-111111111111', 'dietary', '우드 텍스처'),
  
  ('22222222-2222-2222-2222-222222222222', 'dietary', 'LED'),
  ('22222222-2222-2222-2222-222222222222', 'dietary', '스틸'),
  ('22222222-2222-2222-2222-222222222222', 'dietary', '직선형'),
  
  ('33333333-3333-3333-3333-333333333333', 'dietary', 'LED'),
  ('33333333-3333-3333-3333-333333333333', 'dietary', '오팔글라스'),
  ('33333333-3333-3333-3333-333333333333', 'dietary', '분산조명'),
  
  ('44444444-4444-4444-4444-444444444444', 'dietary', '빈티지'),
  ('44444444-4444-4444-4444-444444444444', 'dietary', '메탈'),
  ('44444444-4444-4444-4444-444444444444', 'dietary', '직부형'),
  
  ('55555555-5555-5555-5555-555555555555', 'dietary', 'LED'),
  ('55555555-5555-5555-5555-555555555555', 'dietary', '데스크'),
  ('55555555-5555-5555-5555-555555555555', 'dietary', '미니멀'),
  
  ('66666666-6666-6666-6666-666666666666', 'dietary', '우드'),
  ('66666666-6666-6666-6666-666666666666', 'dietary', '스탠드'),
  ('66666666-6666-6666-6666-666666666666', 'dietary', '따뜻한광'),
  
  ('77777777-7777-7777-7777-777777777777', 'dietary', '유리돔'),
  ('77777777-7777-7777-7777-777777777777', 'dietary', '테이블램프'),
  ('77777777-7777-7777-7777-777777777777', 'dietary', '포근한빛'),
  
  ('88888888-8888-8888-8888-888888888888', 'dietary', 'LED'),
  ('88888888-8888-8888-8888-888888888888', 'dietary', '직부'),
  ('88888888-8888-8888-8888-888888888888', 'dietary', '곡선디자인'),
  
  ('99999999-9999-9999-9999-999999999999', 'dietary', '페이퍼쉐이드'),
  ('99999999-9999-9999-9999-999999999999', 'dietary', '따뜻한톤'),
  ('99999999-9999-9999-9999-999999999999', 'dietary', '경량'),
  
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dietary', '글라스'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dietary', '메탈라인'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dietary', '펜던트')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 완료!
-- 
-- 다음 단계:
-- 1. Supabase 대시보드에서 이 SQL 실행
-- 2. Auth 설정 (https://supabase.com/docs/guides/auth)
-- 3. Storage 설정 (제품 이미지 업로드용)
-- 4. API 키 발급 및 환경 변수 설정
-- ============================================================================

