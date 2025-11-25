import React, { useState, useMemo } from 'react';

// Import all page components
import ProductListPage from './components/ProductListPage';
import ProductDetailPage from './components/ProductDetailPage';
import BasketPage from './components/BasketPage';
import CheckoutPage from './components/CheckoutPage';
import PaymentPage from './components/PaymentPage';
import ConfirmationPage from './components/ConfirmationPage';
import OrderConfirmationPage from './components/OrderConfirmationPage';
import PlaceholderPage from './components/PlaceholderPage';
import AddToCartOverlay from './components/AddToCartOverlay';
import Menu from './components/Menu';

// Import hooks and components for Supabase integration
import { useProducts } from './hooks/useProducts';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorMessage from './components/shared/ErrorMessage';

// Import types and utilities
import { toProductDisplay, toCartItem, Product } from './types/database.types';
import { formatPrice } from './utils/formatters';

// ============================================================================
// REMOVED: Hard-coded PRODUCTS array
// Now fetching from Supabase via useProducts hook
// ============================================================================

// Legacy PRODUCTS array structure for reference:
const LEGACY_PRODUCTS = [
  {
    id: 1,
    name: "스칸디나비아 펜던트 조명",
    price: "₩119,000",
    priceValue: 119000,
    farm: "루미나 디자인",
    images: [
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5",  // 펜던트 조명
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"   // 인테리어 조명
    ],
    isFavorite: false,
    description: "자연스러운 우드 톤과 미니멀한 실루엣의 펜던트 조명.",
    location: "덴마크 코펜하겐, 루미나 디자인",
    dietary: ["LED", "미니멀", "우드 텍스처"]
  },
  {
    id: 2,
    name: "모던 스틸 바 램프",
    price: "₩159,000",
    priceValue: 159000,
    farm: "노드스틸",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",  // 모던 램프
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e"   // 인테리어
    ],
    isFavorite: false,
    description: "슬림한 직선형 바 조명.",
    location: "스웨덴 말뫼, 노드스틸",
    dietary: ["LED", "스틸", "직선형"]
  },
  {
    id: 3,
    name: "글로우볼 플로어 램프",
    price: "₩189,000",
    priceValue: 189000,
    farm: "글로우 아틀리에",
    images: [
      "https://images.unsplash.com/photo-1638244398513-17b778d24efe?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",  // 플로어 램프
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc"   // 리빙룸
    ],
    isFavorite: false,
    description: "오팔 글라스가 빛을 부드럽게 분산시켜주는 플로어 램프.",
    location: "독일 베를린, 글로우 아틀리에",
    dietary: ["LED", "오팔글라스", "분산조명"]
  },
  {
    id: 4,
    name: "아틀리에 인더스트리얼 벽등",
    price: "₩79,000",
    priceValue: 79000,
    farm: "아이언웍스",
    images: [
      "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f",  // 벽등
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64"   // 인더스트리얼
    ],
    isFavorite: false,
    description: "메탈 질감을 살린 카페풍 인더스트리얼 벽등.",
    location: "영국 맨체스터, 아이언웍스",
    dietary: ["빈티지", "메탈", "직부형"]
  },
  {
    id: 5,
    name: "미니멀 데스크 램프",
    price: "₩69,000",
    priceValue: 69000,
    farm: "라이트랩",
    images: [
      "https://images.unsplash.com/photo-1756474215958-f0c2a31eddc1?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",  // 데스크 램프
      "https://images.unsplash.com/photo-1449247709967-d4461a6a6103"   // 책상 조명
    ],
    isFavorite: false,
    description: "얇고 단정한 라인 디자인의 데스크 램프.",
    location: "일본 도쿄, 라이트랩",
    dietary: ["LED", "데스크", "미니멀"]
  },
  {
    id: 6,
    name: "우드 프레임 스탠드 조명",
    price: "₩129,000",
    priceValue: 129000,
    farm: "포레스트라이트",
    images: [
      "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22",  // 우드 램프
      "https://images.unsplash.com/photo-1489171078254-c3365d6e359f"   // 스탠드
    ],
    isFavorite: false,
    description: "원목 프레임이 따뜻한 분위기를 만드는 스탠드 조명.",
    location: "핀란드 헬싱키, 포레스트라이트",
    dietary: ["우드", "스탠드", "따뜻한광"]
  },
  {
    id: 7,
    name: "글라스 돔 테이블 램프",
    price: "₩89,000",
    priceValue: 89000,
    farm: "돔라이트 스튜디오",
    images: [
      "https://cdn.pixabay.com/photo/2014/11/15/14/00/tiffany-531993_1280.jpg",  // 테이블 램프
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5"   // 글라스 조명
    ],
    isFavorite: false,
    description: "유리 돔 안의 빛이 은은하게 퍼지는 테이블 램프.",
    location: "프랑스 파리, 돔라이트 스튜디오",
    dietary: ["유리돔", "테이블램프", "포근한빛"]
  },
  {
    id: 8,
    name: "라인 아크 LED 천장등",
    price: "₩149,000",
    priceValue: 149000,
    farm: "아크라이트",
    images: [
      "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89",  // LED 천장등
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64"   // 모던 조명
    ],
    isFavorite: false,
    description: "부드러운 곡선 라인으로 공간을 정돈해주는 천장등.",
    location: "네덜란드 암스테르담, 아크라이트",
    dietary: ["LED", "직부", "곡선디자인"]
  },
  {
    id: 9,
    name: "노르딕 페이퍼쉐이드 램프",
    price: "₩59,000",
    priceValue: 59000,
    farm: "페이퍼라이트",
    images: [
      "https://images.pexels.com/photos/34836270/pexels-photo-34836270.jpeg",
      "https://images.pexels.com/photos/34836270/pexels-photo-34836270.jpeg"
    ],
    isFavorite: false,
    description: "종이 질감을 살린 북유럽풍 페이퍼램프.",
    location: "노르웨이 오슬로, 페이퍼라이트",
    dietary: ["페이퍼쉐이드", "따뜻한톤", "경량"]
  },
  {
    id: 10,
    name: "아르코 글라스 펜던트",
    price: "₩139,000",
    priceValue: 139000,
    farm: "아르코 라보라토리",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",  // 글라스 펜던트
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5"   // 인테리어 조명
    ],
    isFavorite: false,
    description: "반투명 글라스와 금속 라인의 조화가 아름다운 펜던트.",
    location: "이탈리아 밀라노, 아르코 라보라토리",
    dietary: ["글라스", "메탈라인", "펜던트"]
  }
] as const;

// ============================================================================
// Application Types
// ============================================================================

type SortOption = 'default' | 'a-z' | 'price';
type ViewMode = 'list' | 'detail' | 'basket' | 'checkout' | 'payment' | 'confirmation' | 'orderConfirmation' | 'newsstand' | 'about' | 'profile';

interface CartItem {
  id: number;
  name: string;
  price: string;
  priceValue: number;
  image: string;
  quantity: number;
}

interface OverlayProduct {
  id: number;
  name: string;
  image: string;
}

interface CustomerInfo {
  fullName: string;
  zipCode: string;
  address: string;
  detailedAddress: string;
  city?: string;
  country?: string;
  state?: string;
}

// ============================================================================
// Product Display Type (for UI compatibility)
// ============================================================================
interface ProductDisplay {
  id: number;
  name: string;
  price: string;
  priceValue: number;
  farm: string;
  images: string[];
  isFavorite: boolean;
  description: string;
  location: string;
  dietary: string[];
}

export default function App() {
  // ============================================================================
  // Supabase Data Integration
  // ============================================================================
  const { 
    products: dbProducts, 
    loading: productsLoading, 
    error: productsError, 
    refetch: refetchProducts 
  } = useProducts();

  // Transform DB products to UI format
  // Note: DB에서 받은 데이터를 UI 레이어 타입으로 변환
  const products = useMemo(() => {
    return dbProducts.map((product): ProductDisplay => ({
      id: product.id,
      name: product.name,
      price: formatPrice(product.price),
      priceValue: product.price,
      farm: product.farm,
      images: product.images,
      isFavorite: product.is_favorite,
      description: product.description,
      location: product.location,
      dietary: product.dietary,
    }));
  }, [dbProducts]);

  // ============================================================================
  // Application State
  // ============================================================================
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProduct, setSelectedProduct] = useState<ProductDisplay | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  
  // Customer and payment information from checkout
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    fullName: '',
    zipCode: '',
    address: '',
    detailedAddress: ''
  });
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    useBillingAddress: true,
    billingZipCode: '',
    billingAddress: '',
    billingDetailedAddress: ''
  });
  
  // Add to cart overlay state
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayProduct, setOverlayProduct] = useState<OverlayProduct | null>(null);
  const [overlayQuantity, setOverlayQuantity] = useState(1);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ============================================================================
  // Product Filtering and Sorting
  // ============================================================================
  const filteredAndSortedProducts = useMemo(() => {
    // 배열 복사로 원본 mutation 방지
    let filtered = [...products].filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortOption) {
      case 'a-z':
        // sort는 원본을 변경하므로 복사 후 정렬
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'price':
        return [...filtered].sort((a, b) => a.priceValue - b.priceValue);
      default:
        return filtered;
    }
  }, [products, searchTerm, sortOption]);

  // ============================================================================
  // Favorites Management (낙관적 업데이트 패턴)
  // TODO: Integrate with Supabase favorites table for persistence
  // 참고: https://supabase.com/docs/guides/realtime/postgres-changes
  // ============================================================================
  const toggleFavorite = async (productId: number) => {
    const wasFavorite = favorites.has(productId);
    
    // 1. 낙관적 업데이트: UI 먼저 변경
    setFavorites(prev => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    // 2. 서버에 요청 (추후 Supabase 연동 시 활성화)
    try {
      // TODO: Supabase favorites API 호출
      // if (wasFavorite) {
      //   await favoriteService.remove(productId, userId, sessionId);
      // } else {
      //   await favoriteService.add(productId, userId, sessionId);
      // }
    } catch (error) {
      // 3. 실패 시 롤백
      console.error('Failed to toggle favorite:', error);
      setFavorites(prev => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.add(productId); // 원래 상태로 복구
        } else {
          next.delete(productId);
        }
        return next;
      });
    }
  };

  // ============================================================================
  // Cart Management
  // ============================================================================
  const showAddToCartOverlay = (product: ProductDisplay, quantity = 1) => {
    setOverlayProduct({
      id: product.id,
      name: product.name,
      image: product.images[0]
    });
    setOverlayQuantity(quantity);
    setShowOverlay(true);

    // Hide overlay after 1 second
    setTimeout(() => {
      setShowOverlay(false);
    }, 1000);
  };

  const addToCart = (productId?: number, quantityToAdd = 1) => {
    let targetProduct;
    
    if (productId) {
      targetProduct = products.find(p => p.id === productId);
    } else if (selectedProduct) {
      targetProduct = selectedProduct;
    }
    
    if (!targetProduct) return;

    // Show overlay
    showAddToCartOverlay(targetProduct, quantityToAdd);

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === targetProduct.id);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === targetProduct.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      } else {
        return [...prevItems, {
          id: targetProduct.id,
          name: targetProduct.name,
          price: targetProduct.price,
          priceValue: targetProduct.priceValue,
          image: targetProduct.images[0],
          quantity: quantityToAdd
        }];
      }
    });
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  const handleProductClick = (product: ProductDisplay) => {
    setSelectedProduct(product);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProduct(null);
  };

  const handleCartClick = () => {
    setViewMode('basket');
  };

  const handleBackFromBasket = () => {
    setViewMode('list');
  };

  const handleGoToCheckout = () => {
    setViewMode('checkout');
  };

  const handleBackFromCheckout = () => {
    setViewMode('basket');
  };

  const handleProceedToPayment = (customerData: CustomerInfo) => {
    setCustomerInfo(customerData);
    setViewMode('payment');
  };

  const handleBackFromPayment = () => {
    setViewMode('checkout');
  };

  const handleProceedToConfirmation = (payment: typeof paymentInfo) => {
    setPaymentInfo(payment);
    setViewMode('confirmation');
  };

  const handleBackFromConfirmation = () => {
    setViewMode('payment');
  };

  const handleCompletePurchase = (orderNum: string) => {
    // Show order confirmation and clear cart
    setOrderNumber(orderNum);
    setViewMode('orderConfirmation');
    setCartItems([]);
  };

  const handleShopFromOrderConfirmation = () => {
    setViewMode('list');
    setSelectedProduct(null);
    setOrderNumber('');
    // Reset customer info and payment info for new order
    setCustomerInfo({
      fullName: '',
      zipCode: '',
      address: '',
      detailedAddress: ''
    });
    setPaymentInfo({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      useBillingAddress: true,
      billingZipCode: '',
      billingAddress: '',
      billingDetailedAddress: ''
    });
  };

  const handleMenuNavigation = (screen: string) => {
    setViewMode(screen as ViewMode);
    setSelectedProduct(null);
  };

  // ============================================================================
  // View Rendering
  // ============================================================================
  const renderCurrentView = () => {
    // Show loading state (products만 체크 - favorites는 백그라운드 로드)
    if (productsLoading && viewMode === 'list') {
      return <LoadingSpinner message="상품을 불러오는 중..." fullScreen />;
    }

    // Show error state
    if (productsError && viewMode === 'list') {
      return (
        <ErrorMessage 
          message={productsError} 
          type="network"
          onRetry={refetchProducts}
          fullScreen 
        />
      );
    }

    switch (viewMode) {
      case 'list':
        return (
          <ProductListPage
            products={filteredAndSortedProducts}
            favorites={favorites}
            searchTerm={searchTerm}
            sortOption={sortOption}
            cartCount={cartCount}
            onSearchChange={setSearchTerm}
            onSortChange={setSortOption}
            onToggleFavorite={toggleFavorite}
            onAddToCart={(productId) => addToCart(productId, 1)}
            onProductClick={handleProductClick}
            onMenuClick={() => setIsNavOpen(true)}
            onCartClick={handleCartClick}
          />
        );
      
      case 'detail':
        return selectedProduct ? (
          <ProductDetailPage
            product={selectedProduct}
            cartCount={cartCount}
            onBack={handleBackToList}
            onAddToCart={(quantity) => addToCart(undefined, quantity)}
            onMenuClick={() => setIsNavOpen(true)}
            onCartClick={handleCartClick}
          />
        ) : null;
      
      case 'basket':
        return (
          <BasketPage
            cartItems={cartItems}
            onBack={handleBackFromBasket}
            onMenuClick={() => setIsNavOpen(true)}
            onUpdateQuantity={updateCartItemQuantity}
            onGoToCheckout={handleGoToCheckout}
          />
        );
      
      case 'checkout':
        return (
          <CheckoutPage
            cartCount={cartCount}
            customerInfo={customerInfo}
            onBack={handleBackFromCheckout}
            onMenuClick={() => setIsNavOpen(true)}
            onProceedToPayment={handleProceedToPayment}
          />
        );
      
      case 'payment':
        return (
          <PaymentPage
            cartCount={cartCount}
            onBack={handleBackFromPayment}
            onMenuClick={() => setIsNavOpen(true)}
            onProceedToConfirmation={handleProceedToConfirmation}
          />
        );
      
      case 'confirmation':
        return (
          <ConfirmationPage
            cartItems={cartItems}
            customerInfo={customerInfo}
            paymentInfo={paymentInfo}
            cartCount={cartCount}
            onBack={handleBackFromConfirmation}
            onMenuClick={() => setIsNavOpen(true)}
            onUpdateQuantity={updateCartItemQuantity}
            onCompletePurchase={handleCompletePurchase}
          />
        );
      
      case 'orderConfirmation':
        return (
          <OrderConfirmationPage
            orderNumber={orderNumber}
            cartCount={0} // Cart is cleared after purchase
            customerInfo={customerInfo}
            onShop={handleShopFromOrderConfirmation}
            onMenuClick={() => setIsNavOpen(true)}
          />
        );
      
      case 'newsstand':
      case 'about':
      case 'profile':
        return (
          <PlaceholderPage 
            title={viewMode === 'newsstand' ? 'Newsstand' : viewMode === 'about' ? 'Who we are' : 'My Profile'}
            onBack={handleBackToList}
            onMenuClick={() => setIsNavOpen(true)}
            cartCount={cartCount}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* iPhone 16 Container */}
      <div className="w-[393px] h-[852px] bg-[#ffffff] relative overflow-hidden rounded-[40px] shadow-2xl border-8 border-black">
        
        {renderCurrentView()}

        {/* Add to Cart Overlay */}
        <AddToCartOverlay
          isVisible={showOverlay}
          product={overlayProduct}
          quantity={overlayQuantity}
        />

        {/* Custom Menu */}
        <Menu
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          onNavigate={handleMenuNavigation}
        />
      </div>
    </div>
  );
}
