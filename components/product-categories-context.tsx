"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProductCategoryFields = {
  model: boolean;
  storage: boolean;
  color: boolean;
  condition: boolean;
  battery: boolean;
  imei: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
  fields: ProductCategoryFields;
};

type ProductCategoriesContextType = {
  categories: ProductCategory[];
  addCategory: (name: string, fields: ProductCategoryFields) => Promise<void>;
  updateCategory: (id: string, name: string, fields: ProductCategoryFields) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryByName: (name: string) => ProductCategory | undefined;
  isLoading: boolean;
};

const ProductCategoriesContext = createContext<ProductCategoriesContextType | undefined>(undefined);

export function ProductCategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setCategories(data.map((cat) => ({
          id: cat.id,
          name: cat.name,
          fields: cat.fields as ProductCategoryFields,
        })));
      }
    } catch (error) {
      console.error("[v0] Error loading categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (name: string, fields: ProductCategoryFields) => {
    try {
      const newCategory = {
        id: `cat_${Date.now()}`,
        name,
        fields,
      };

      const supabase = createClient();
      const { error } = await supabase.from("product_categories").insert(newCategory);

      if (error) throw error;

      setCategories([...categories, newCategory]);
    } catch (error) {
      console.error("[v0] Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (id: string, name: string, fields: ProductCategoryFields) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_categories")
        .update({ name, fields })
        .eq("id", id);

      if (error) throw error;

      setCategories(categories.map((cat) =>
        cat.id === id ? { ...cat, name, fields } : cat
      ));
    } catch (error) {
      console.error("[v0] Error updating category:", error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("product_categories").delete().eq("id", id);

      if (error) throw error;

      setCategories(categories.filter((cat) => cat.id !== id));
    } catch (error) {
      console.error("[v0] Error deleting category:", error);
      throw error;
    }
  };

  const getCategoryByName = (name: string) => {
    return categories.find((cat) => cat.name === name);
  };

  return (
    <ProductCategoriesContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryByName,
        isLoading,
      }}
    >
      {children}
    </ProductCategoriesContext.Provider>
  );
}

export function useProductCategories() {
  const context = useContext(ProductCategoriesContext);
  if (!context) {
    throw new Error("useProductCategories must be used within a ProductCategoriesProvider");
  }
  return context;
}
