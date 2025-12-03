"use client";

import CategoryListingPage from "../components/CategoryListingPage";

const SUB_CATEGORIES = [
  "All",

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
      heroTitle="All Products for Men"
      heroSubtitle="Weather-ready layers designed with FATIH simplicity."
      subCategories={SUB_CATEGORIES}
      defaultSubcategory={SUB_CATEGORIES[0]}
    />
  );
}

