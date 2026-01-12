"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CategoryListingPage from "../components/CategoryListingPage";
import { api } from "@/lib/api";

type CategoryFromAPI = {
  id: number;
  name: string;
  parentId: number | null;
  children?: CategoryFromAPI[];
};

// Fallback subcategories for known categories
const FALLBACK_SUBCATEGORIES: Record<string, string[]> = {
  women: ["All", "Coats & Jackets", "Bottoms", "Knitwear", "Accessories"],
  men: ["All", "Coats & Jackets", "Bottoms", "Knitwear", "Accessories"],
  beauty: ["All", "Skincare", "Makeup", "Fragrance"],
};

export default function DynamicCategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const [categoryData, setCategoryData] = useState<CategoryFromAPI | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        const categories = await api.get<CategoryFromAPI[]>("/categories");
        
        // Find the category by name (case-insensitive)
        const found = categories?.find(
          (cat) => cat.name.toLowerCase() === categorySlug.toLowerCase()
        );
        
        if (found) {
          setCategoryData(found);
          
          // Get subcategories (children of this category)
          const children = categories?.filter((cat) => cat.parentId === found.id) || [];
          const subNames = children.map((c) => c.name);
          setSubcategories(["All", ...subNames]);
        } else {
          // Use fallback if available
          const fallback = FALLBACK_SUBCATEGORIES[categorySlug.toLowerCase()];
          if (fallback) {
            setSubcategories(fallback);
          }
        }
      } catch (err) {
        console.error("Failed to fetch category data:", err);
        // Use fallback subcategories
        const fallback = FALLBACK_SUBCATEGORIES[categorySlug.toLowerCase()];
        if (fallback) {
          setSubcategories(fallback);
        }
      } finally {
        setLoading(false);
      }
    };

    if (categorySlug) {
      fetchCategoryData();
    }
  }, [categorySlug]);

  // Format category name for display
  const categoryLabel = categoryData?.name || 
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <CategoryListingPage
      categoryKey={categorySlug.toLowerCase()}
      label={categoryLabel}
      heroTitle={`All Products for ${categoryLabel}`}
      heroSubtitle={`Explore our ${categoryLabel} collection.`}
      subCategories={subcategories}
      defaultSubcategory="All"
    />
  );
}

