# A/B 테스트 시스템 구현 가이드

## 📋 개요

가격 폰트 사이즈 A/B 테스트를 위한 **Production-Ready** 시스템입니다.

### 🎯 실험 목표
- **가설**: 가격 폰트 크기를 2~3px 키우면 상세 페이지 진입률(PDP Click Rate)이 증가할 것
- **Control**: 기존 14px 폰트
- **Variant**: 16px + font-semibold
- **목표 지표**: 상세 페이지 진입률 개선

### ✨ 주요 기능
- ✅ 통계적 유의성 검증 (카이제곱 검정, 신뢰구간)
- ✅ 실험 충돌 방지
- ✅ 가드레일 (핵심 지표 보호)
- ✅ SRM (Sample Ratio Mismatch) 체크
- ✅ 오프라인 이벤트 큐잉
- ✅ 실시간 모니터링
- ✅ 자동 결과 판정
- ✅ 세그멘테이션
- ✅ 관리자 대시보드

## 🚀 설치 및 설정

### 1. 데이터베이스 설정 (Supabase)

Supabase SQL Editor에서 순서대로 실행:

```bash
# 1. 스키마 생성
database_ab_test_schema.sql

# 2. 통계 함수 생성
database_ab_test_functions.sql

# 3. 초기 실험 데이터 삽입
database_ab_test_seed.sql
```

### 2. 환경 변수 설정

`.env` 파일에 Supabase 정보 추가:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 의존성 설치

이미 `package.json`에 포함된 패키지:
- `@supabase/supabase-js`: Supabase 클라이언트
- `uuid`: 사용자 식별자 생성
- `clsx`: 클래스 조합

## 📁 파일 구조

```
src/
├── types/
│   └── abtest.types.ts              # 타입 정의
├── utils/
│   ├── user-identifier.ts           # 사용자 식별 및 세그멘테이션
│   └── experiment-analyzer.ts       # 실험 결과 분석
├── services/
│   └── abtest.service.ts            # A/B 테스트 서비스 (오프라인 큐잉)
├── hooks/
│   └── useABTest.ts                 # React Hook
└── components/
    ├── ProductListPage.tsx          # A/B 테스트 적용됨
    └── ABTestDashboard.tsx          # 관리자 대시보드

database_ab_test_schema.sql         # DB 스키마
database_ab_test_functions.sql      # 통계 함수
database_ab_test_seed.sql            # 초기 데이터
```

## 💻 사용법

### 프론트엔드에서 A/B 테스트 사용

```typescript
import { useABTest } from '../hooks/useABTest';

function MyComponent() {
  const { variant, trackEvent, isLoading, isEligible } = useABTest(
    'price_font_size_experiment',
    { debug: true }
  );
  
  // Variant에 따라 UI 변경
  if (variant === 'variant') {
    // Variant UI
  } else {
    // Control UI
  }
  
  // 이벤트 추적
  const handleClick = () => {
    trackEvent('product_detail_click', { product_id: 123 });
  };
  
  return <div>...</div>;
}
```

### 관리자 대시보드 접근

```typescript
// App.tsx에 라우트 추가
import ABTestDashboard from './components/ABTestDashboard';

// 예: /admin/abtest 경로에 렌더링
```

## 📊 데이터 수집

### 자동 추적 이벤트

1. **experiment_exposure**: 실험 노출 (자동)
2. **product_list_view**: 리스트 페이지 뷰 (자동)
3. **product_detail_click**: 상품 클릭 (자동)

### 사용자 세그먼트 (자동 수집)

- `is_new_user`: 신규 사용자 여부
- `device_type`: mobile, desktop, tablet
- `browser`: chrome, safari, firefox, edge
- `os`: windows, macos, linux, android, ios
- `time_of_day`: morning, afternoon, evening, night
- `day_of_week`: monday, tuesday, ...
- `referrer_source`: google, facebook, twitter, direct, other

## 🔬 실험 모니터링

### Supabase에서 직접 확인

```sql
-- 실험 상태 확인
SELECT * FROM ab_test_experiments 
WHERE name = 'price_font_size_experiment';

-- 현재 통계 확인
SELECT * FROM get_ab_test_statistics('experiment_id');

-- 실험 결과 분석
SELECT * FROM analyze_experiment_results('experiment_id');

-- SRM 체크
SELECT * FROM check_srm('experiment_id');

-- 가드레일 체크
SELECT * FROM check_guardrails('experiment_id');
```

### 대시보드에서 확인

1. 실시간 전환율 그래프
2. 통계적 유의성 판정
3. Lift (개선율)
4. 신뢰구간
5. 권장사항

## 🛡️ 안전장치

### 1. 가드레일

```sql
-- 이탈률이 20%를 초과하면 경고
INSERT INTO ab_test_guardrails (experiment_id, metric_name, threshold, comparison_operator)
VALUES ('exp_id', 'bounce_rate', 20.0, '>');
```

### 2. SRM 체크

실험 그룹 할당이 공정한지 자동 확인 (50/50 비율 검증)

### 3. 오프라인 큐잉

네트워크 연결이 끊어져도 이벤트를 localStorage에 저장 후 온라인 복구 시 전송

## 📈 실험 결과 해석

### 통계적 유의성

- **p-value < 0.05**: 통계적으로 유의함 ✅
- **p-value >= 0.05**: 유의하지 않음 ⚠️

### Lift (개선율)

- **Lift > 0**: Variant가 더 좋음 📈
- **Lift < 0**: Control이 더 좋음 📉
- **Lift ≈ 0**: 차이 없음 ➖

### 신뢰구간

- Control: [7.2%, 8.8%]
- Variant: [8.4%, 10.2%]
- 두 구간이 겹치지 않으면 확실한 차이

## 🔧 고급 기능

### 1. 실험 충돌 방지

```sql
-- 실험 A와 B가 동시 실행 불가
UPDATE ab_test_experiments
SET conflicting_experiments = ARRAY['experiment_b_id']
WHERE name = 'experiment_a';
```

### 2. Exposure 제한

```sql
-- 처음엔 10% 사용자에게만 노출
UPDATE ab_test_experiments
SET max_exposure_percentage = 10
WHERE name = 'price_font_size_experiment';
```

### 3. 자동 롤백

```sql
-- 가드레일 위반 시 자동 정지
UPDATE ab_test_experiments
SET automatic_rollback = true
WHERE name = 'price_font_size_experiment';
```

## 🐛 트러블슈팅

### 문제: 실험이 활성화되지 않음

**해결**: Supabase에서 실험 상태 확인

```sql
UPDATE ab_test_experiments
SET is_active = true, status = 'running'
WHERE name = 'price_font_size_experiment';
```

### 문제: 이벤트가 추적되지 않음

**해결**: 
1. 브라우저 콘솔 확인
2. Supabase RLS 정책 확인
3. `debug: true` 옵션으로 Hook 사용

### 문제: 통계가 표시되지 않음

**해결**: 최소 샘플 크기 확인 (최소 100명 필요)

## 📚 참고 자료

- [Supabase Documentation](https://supabase.com/docs)
- [A/B Testing Best Practices](https://www.optimizely.com/optimization-glossary/ab-testing/)
- [카이제곱 검정](https://en.wikipedia.org/wiki/Chi-squared_test)
- [ICE 프레임워크](https://www.productplan.com/glossary/ice-scoring-model/)

## 🎓 실험 체크리스트

### 실험 시작 전
- [ ] 가설 명확히 정의
- [ ] 최소 샘플 크기 계산
- [ ] 실험 기간 설정 (최소 2주 권장)
- [ ] 가드레일 메트릭 설정
- [ ] 충돌하는 실험 확인

### 실험 중
- [ ] 일별 SRM 체크
- [ ] 가드레일 모니터링
- [ ] 이상 패턴 감지

### 실험 종료
- [ ] 통계적 유의성 확인
- [ ] 세그먼트별 영향 분석
- [ ] 학습 내용 기록
- [ ] 롤아웃 또는 롤백 결정

## 🤝 기여

개선 사항이나 버그 리포트는 이슈로 등록해주세요.

## 📄 라이선스

MIT License

---

**Made with ❤️ for LightSpace**

