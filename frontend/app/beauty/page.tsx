"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "All",
  "Skincare",
  "Body Care",
  "Hair Care",
  "Fragrance",
  "Bath",
  "Tools & Accessories",
  "Makeup",
  "Travel Sizes",
];

export default function BeautyCategoryPage() {
  return (
    <CategoryListingPage
      categoryKey="beauty"
      label="Beauty"
      heroTitle="Skincare Essentials"
      heroSubtitle="Minimal formulas for everyday hydration and balance."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[0]}
    />
  );
}

