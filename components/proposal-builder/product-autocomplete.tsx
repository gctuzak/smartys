"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { searchProductsAction, ProductSearchResult } from "@/app/actions/search-products";
import { Loader2 } from "lucide-react";

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (product: ProductSearchResult) => void;
  className?: string;
}

export function ProductAutocomplete({ value, onChange, onSelect, className }: ProductAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    onChange(query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchProductsAction(query);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (product: ProductSearchResult) => {
    onChange(product.name);
    if (onSelect) {
      onSelect(product);
    }
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          className={className}
          onFocus={() => {
              if (value.length >= 2) handleSearch(value);
          }}
          placeholder="Ürün ara veya manuel yaz..."
        />
        {isLoading && (
          <div className="absolute right-2 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl shadow-gray-200/50 max-h-80 overflow-auto animate-in fade-in zoom-in-95 duration-200 p-1">
          {suggestions.map((product) => (
            <div
              key={product.id}
              className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer text-sm rounded-lg transition-colors border-b border-gray-50 last:border-0"
              onClick={() => handleSelect(product)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {product.name}
                  {product.type === 'service' && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Hizmet</span>
                  )}
                </div>
                {product.defaultPrice && (
                    <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                        {product.defaultPrice} {product.unit ? `/${product.unit}` : ''}
                    </div>
                )}
              </div>
              {product.code && <div className="text-xs text-gray-500 font-mono">#{product.code}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
