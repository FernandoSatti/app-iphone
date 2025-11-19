"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type AttributeType = 'color' | 'storage' | 'condition';

export interface ProductAttribute {
  id: string;
  type: AttributeType;
  value: string;
}

interface ProductAttributesContextType {
  attributes: ProductAttribute[];
  getAttributesByType: (type: AttributeType) => ProductAttribute[];
  addAttribute: (type: AttributeType, value: string) => Promise<void>;
  deleteAttribute: (id: string) => Promise<void>;
  refreshAttributes: () => Promise<void>;
}

const ProductAttributesContext = createContext<ProductAttributesContextType | undefined>(undefined);

export function ProductAttributesProvider({ children }: { children: React.ReactNode }) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  const loadAttributes = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*')
        .order('type', { ascending: true })
        .order('value', { ascending: true });

      if (error) throw error;
      setAttributes(data || []);
    } catch (error) {
      console.error('[v0] Error loading product attributes:', error);
    }
  }, []);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  const getAttributesByType = (type: AttributeType): ProductAttribute[] => {
    return attributes.filter(attr => attr.type === type);
  };

  const addAttribute = async (type: AttributeType, value: string) => {
    try {
      const id = `${type}-${Date.now()}`;
      const supabase = createClient();
      const { error } = await supabase
        .from('product_attributes')
        .insert({ id, type, value });

      if (error) throw error;
      await loadAttributes();
    } catch (error) {
      console.error('[v0] Error adding product attribute:', error);
      throw error;
    }
  };

  const deleteAttribute = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('product_attributes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAttributes();
    } catch (error) {
      console.error('[v0] Error deleting product attribute:', error);
      throw error;
    }
  };

  const refreshAttributes = async () => {
    await loadAttributes();
  };

  return (
    <ProductAttributesContext.Provider
      value={{
        attributes,
        getAttributesByType,
        addAttribute,
        deleteAttribute,
        refreshAttributes,
      }}
    >
      {children}
    </ProductAttributesContext.Provider>
  );
}

export function useProductAttributes() {
  const context = useContext(ProductAttributesContext);
  if (!context) {
    throw new Error('useProductAttributes must be used within a ProductAttributesProvider');
  }
  return context;
}
