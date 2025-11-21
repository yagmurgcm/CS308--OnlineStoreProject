"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "New In",
  "Coats & Jackets",
  "Knitwear",
  "Dresses",
  "Shirts & Blouses",
  "Bottoms",
  "Loungewear",
  "Accessories",
];

export default function WomenCategoryPage() {
  return (
    <CategoryListingPage
      categoryKey="women"
      label="Women"
      heroTitle="Coats & Jackets"
      heroSubtitle="Layer up with refined silhouettes and warm textures."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[1]}
    />
  );
}

