"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "Coats & Jackets",
  "Hoodies & Sweatshirts",
  "Jumpers & Cardigans",
  "Trousers & Shorts",
  "Shirts",
  "Tops & T-Shirts",
  "Polo Shirts",
  "Pyjamas & Loungewear",
];

export default function MenCategoryPage() {
  return (
    <CategoryListingPage
      categoryKey="men"
      label="Men"
      heroTitle="Coats & Jackets"
      heroSubtitle="Weather-ready layers designed with MUJI simplicity."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[0]}
    />
  );
}

