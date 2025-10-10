import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para debounce de valores
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos
 * @returns Valor debounced
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Hook para debounce de funções
 * @param callback - Função a ser debounced
 * @param delay - Delay em milissegundos
 * @returns Função debounced
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

/**
 * Hook para debounce de arrays (útil para mensagens)
 * @param value - Array a ser debounced
 * @param delay - Delay em milissegundos
 * @returns Array debounced
 */
export const useDebouncedArray = <T>(value: T[], delay: number): T[] => {
  const [debouncedValue, setDebouncedValue] = useState<T[]>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
