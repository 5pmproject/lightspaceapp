import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types/database.types';
import { productsService } from '../services/products.service';

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  isRefetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefetching(true);
      }
      setError(null);
      
      // ServiceResult 패턴 사용
      const result = await productsService.fetchProducts();
      
      if (result.error) {
        setError(result.error.message);
        setProducts([]);
      } else {
        setProducts(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '제품을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  return {
    products,
    loading,
    isRefetching,
    error,
    refetch: () => fetchProducts(false),
  };
}

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

export function useProduct(id: string): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ServiceResult 패턴 사용
        const result = await productsService.fetchProductById(id);
        
        if (!cancelled) {
          if (result.error) {
            setError(result.error.message);
            setProduct(null);
          } else {
            setProduct(result.data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '제품을 불러오는데 실패했습니다.');
          setProduct(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { product, loading, error };
}

interface UseSearchProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  search: (term: string) => Promise<void>;
}

export function useSearchProducts(): UseSearchProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await productsService.searchProducts(term);
      
      if (result.error) {
        setError(result.error.message);
        setProducts([]);
      } else {
        setProducts(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    loading,
    error,
    search,
  };
}

