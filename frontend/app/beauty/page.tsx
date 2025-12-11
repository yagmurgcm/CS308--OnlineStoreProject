"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "All",
  "Care",
  "Fragrance",
  "Accessories",
];

export default function BeautyCategoryPage() {
  return (
    <CategoryListingPage
      categoryKey="beauty"
      label="Beauty"
      heroTitle="All Products for Beauty"
      heroSubtitle="Minimal formulas for everyday hydration and balance."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[0]}
    />
  );
}
