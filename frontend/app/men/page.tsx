"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "All",
  "Coats & Jackets",
  "Knitwear",
  "Bottoms",
  "Shirts & Blouses",
  "Trousers & Shorts",
];

export default function MenCategoryPage() {
  return (
    <CategoryListingPage
      categoryKey="men"
      label="Men"
      heroTitle="All Products for Men"
      heroSubtitle="Weather-ready layers designed with MKN simplicity."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[0]}
    />
  );
}
