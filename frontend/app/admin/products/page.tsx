"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ProductVariant = {
  id: number;
  color: string;
  size: string;
  price: number | string;
  stock: number;
  image?: string;
};

type Product = {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  price: number | string;
  stock: number;
  isActive: boolean;
  image?: string;
  averageRating?: number;
  reviewCount?: number;
  variants?: ProductVariant[];
};

type FormData = {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: string;
  stock: string;
  isActive: boolean;
  image: string;
};

const CATEGORIES = [
  "Women",
  "Men",
  "Beauty",
];

// Subcategories will be dynamically generated from products
const getSubcategoriesForCategory = (
  products: Product[],
  category: string
): string[] => {
  const subcategories = new Set<string>();
  products
    .filter(
      (p) =>
        p.category.toLowerCase() === category.toLowerCase() && p.subcategory
    )
    .forEach((p) => {
      if (p.subcategory) {
        subcategories.add(p.subcategory);
      }
    });
  return Array.from(subcategories).sort();
};

const priceFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: "asc" | "desc" | null;
  }>({
    column: null,
    direction: null,
  });
  const [variantFormData, setVariantFormData] = useState<{
    color: string;
    size: string;
    price: string;
    stock: string;
  }>({
    color: "",
    size: "",
    price: "",
    stock: "",
  });

  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    subcategory: "",
    description: "",
    price: "",
    stock: "",
    isActive: true,
    image: "",
  });

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ items: Product[] }>(
        "/products?limit=1000"
      );
      setProducts(response?.items || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Make sure you're logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: Product) => {
    // Capitalize category to match CATEGORIES constant (Women, Men, Beauty)
    const capitalizedCategory = product.category.charAt(0).toUpperCase() + product.category.slice(1).toLowerCase();

    setFormData({
      name: product.name,
      category: capitalizedCategory,
      subcategory: product.subcategory || "",
      description: product.description || "",
      price: String(product.price),
      stock: String(getTotalStock(product)),
      isActive: product.isActive,
      image: product.image || "",
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }
    setSubmitting(true);
    try {
      await api.delete(`/products/${productId}`);
      await fetchProducts();
      alert("Product deleted successfully");
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields - allow 0 for price and stock (can be managed via variants)
    if (!formData.name || !formData.category) {
      alert("Please fill in all required fields");
      return;
    }

    // Price and stock can be 0 (will be managed via variants)
    const price = formData.price ? parseFloat(formData.price) : 0;
    const stock = formData.stock ? parseInt(formData.stock, 10) : 0;
    
    if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
      alert("Price and stock must be valid numbers (0 or greater)");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description || null,
        price: price,
        stock: stock,
        isActive: formData.isActive,
        image: formData.image || null,
      };

      console.log(`📤 [FRONTEND] Sending update request for product ID: ${editingId}`);
      console.log(`📝 [FRONTEND] Payload being sent:`, payload);

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        console.log(`✅ [FRONTEND] Product update successful for ID: ${editingId}`);
        alert("Product updated successfully");
      } else {
        await api.post("/products", payload);
        console.log(`✅ [FRONTEND] Product creation successful`);
        alert("Product created successfully");
      }

      console.log(`🔄 [FRONTEND] Refreshing product list...`);
      await fetchProducts();
      console.log(`✅ [FRONTEND] Product list refreshed`);
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        category: "",
        subcategory: "",
        description: "",
        price: "",
        stock: "",
        isActive: true,
        image: "",
      });
    } catch (err) {
      console.error("❌ [FRONTEND] Failed to save product:", err);
      alert("Failed to save product. Please check the console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      category: "",
      subcategory: "",
      description: "",
      price: "",
      stock: "",
      isActive: true,
      image: "",
    });
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setVariantFormData({
      color: variant.color,
      size: variant.size,
      price: String(variant.price),
      stock: String(variant.stock),
    });
    setShowVariantForm(true);
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!variantFormData.color || !variantFormData.size) {
      alert("Please fill in color and size");
      return;
    }

    // Validate price and stock as numbers
    const variantPrice = variantFormData.price ? parseFloat(variantFormData.price) : NaN;
    const variantStock = variantFormData.stock ? parseInt(variantFormData.stock, 10) : NaN;
    
    if (isNaN(variantPrice) || isNaN(variantStock) || variantPrice < 0 || variantStock < 0) {
      alert("Price and stock must be valid numbers (0 or greater)");
      return;
    }

    setSubmitting(true);
    try {
      if (selectedVariant) {
        // Update existing variant
        const variantUpdate = {
          color: variantFormData.color,
          size: variantFormData.size,
          price: variantPrice,
          stock: variantStock,
        };

        await api.put(`/products/variant/${selectedVariant.id}`, variantUpdate);
        alert("Variant updated successfully");
      } else if (selectedProduct) {
        // Create new variant
        const variantCreate = {
          color: variantFormData.color,
          size: variantFormData.size,
          price: variantPrice,
          stock: variantStock,
        };

        await api.post(`/products/${selectedProduct.id}/variant`, variantCreate);
        alert("Variant created successfully");
      }

      // Fetch updated products list
      const response = await api.get<{ items: Product[] }>(
        "/products?limit=1000"
      );
      const updatedProducts = response?.items || [];
      setProducts(updatedProducts);

      // Refresh selected product with latest data
      if (selectedProduct) {
        const refreshed = updatedProducts.find((p) => p.id === selectedProduct.id);
        if (refreshed) {
          setSelectedProduct(refreshed);
        }
      }

      setShowVariantForm(false);
      setSelectedVariant(null);
      setVariantFormData({
        color: "",
        size: "",
        price: "",
        stock: "",
      });
    } catch (err) {
      console.error("Failed to save variant:", err);
      alert("Failed to save variant. Please check the console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseVariantForm = () => {
    setShowVariantForm(false);
    setSelectedVariant(null);
    setVariantFormData({
      color: "",
      size: "",
      price: "",
      stock: "",
    });
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSubcategory =
      selectedSubcategory === "All" ||
      p.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase();
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const coercePrice = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getTotalStock = (product: Product): number => {
    if (!product.variants || product.variants.length === 0) {
      return product.stock || 0;
    }
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  };

  const handleSort = (column: string) => {
    let newDirection: "asc" | "desc" | null = "asc";

    if (sortConfig.column === column) {
      if (sortConfig.direction === "asc") {
        newDirection = "desc";
      } else if (sortConfig.direction === "desc") {
        newDirection = null;
      }
    }

    setSortConfig({
      column: newDirection ? column : null,
      direction: newDirection,
    });
  };

  const getSortedProducts = () => {
    let sorted = [...filteredProducts];

    if (!sortConfig.column || !sortConfig.direction) {
      return sorted;
    }

    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.column as keyof Product];
      let bVal: any = b[sortConfig.column as keyof Product];

      // Special handling for price and stock
      if (sortConfig.column === "price") {
        aVal = coercePrice(aVal);
        bVal = coercePrice(bVal);
      } else if (sortConfig.column === "stock") {
        aVal = getTotalStock(a);
        bVal = getTotalStock(b);
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => {
    const isActive = sortConfig.column === column;
    const isAsc = sortConfig.direction === "asc";
    const isDesc = sortConfig.direction === "desc";

    return (
      <th
        className="px-4 py-2 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {isActive && (
            <span className="text-sm font-bold">
              {isAsc ? "↑" : isDesc ? "↓" : ""}
            </span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">Add, edit, and manage your products</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: "",
                category: "",
                subcategory: "",
                description: "",
                price: "",
                stock: "",
                isActive: true,
              });
              setShowForm(true);
            }}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
          >
            + Add Product
          </button>
        </div>

        {/* Stats */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-100 text-blue-800 rounded-xl p-4">
              <div className="text-2xl font-bold">{products.length}</div>
              <div className="text-sm">Total Products</div>
            </div>
            <div className="bg-cyan-100 text-cyan-800 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {products.reduce((total, p) => total + (p.variants?.length || 0), 0)}
              </div>
              <div className="text-sm">Total Variants</div>
            </div>
            <div className="bg-green-100 text-green-800 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {products.reduce((total, p) => total + (p.variants?.filter((v) => v.stock > 0).length || 0), 0)}
              </div>
              <div className="text-sm">In Stock</div>
            </div>
            <div className="bg-red-100 text-red-800 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {products.reduce((total, p) => total + (p.variants?.filter((v) => v.stock === 0).length || 0), 0)}
              </div>
              <div className="text-sm">Out of Stock</div>
            </div>
            <div className="bg-purple-100 text-purple-800 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {products.filter((p) => !p.isActive).length}
              </div>
              <div className="text-sm">Inactive Products</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory("All");
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {selectedCategory !== "All" && (
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Subcategories</option>
              {getSubcategoriesForCategory(products, selectedCategory).map(
                (subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                )
              )}
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading products...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-600">No products found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">
                      Product
                    </th>
                    <SortHeader column="category" label="Category" />
                    <SortHeader column="subcategory" label="Subcategory" />
                    <SortHeader column="price" label="Price" />
                    <SortHeader column="stock" label="Stock" />
                    <SortHeader column="averageRating" label="Rating" />
                    <SortHeader column="isActive" label="Status" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2">
                        <div
                          className="cursor-pointer hover:text-blue-600 transition"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {product.category}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {product.subcategory || "-"}
                      </td>
                      <td className="px-4 py-2 text-xs font-medium text-gray-900">
                        {priceFmt.format(coercePrice(product.price))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTotalStock(product) > 10
                              ? "bg-green-100 text-green-800"
                              : getTotalStock(product) > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                        >
                          {getTotalStock(product)} pcs
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400 text-xs">★</span>
                          <span className="text-xs font-medium">
                            {product.averageRating || "0"}/5
                          </span>
                          <span className="text-xs text-gray-500">
                            ({product.reviewCount || 0})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && !error && products.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-2xl leading-none hover:opacity-75 transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.category}
                  >
                    <option value="">Select Subcategory</option>
                    {formData.category &&
                      getSubcategoriesForCategory(products, formData.category).map(
                        (subcat) => (
                          <option key={subcat} value={subcat}>
                            {subcat}
                          </option>
                        )
                      )}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product description..."
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image || ""}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a full URL to the product image (e.g., https://example.com/image.jpg)
                </p>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Price (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Base price (can be overridden by variants)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Total Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Edit via variants</p>
                </div>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">Active Product</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal - Variants */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-2xl leading-none hover:opacity-75 transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{selectedProduct.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subcategory</p>
                  <p className="font-medium">{selectedProduct.subcategory || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Base Price</p>
                  <p className="font-medium">
                    {priceFmt.format(coercePrice(selectedProduct.price))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="font-medium">{getTotalStock(selectedProduct)}</p>
                </div>
              </div>

              {/* Variants Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Variants</h3>
                  <div className="flex gap-2 items-center">
                    <p className="text-xs text-gray-500">Click a variant to edit</p>
                    <button
                      onClick={() => {
                        setSelectedVariant(null);
                        setVariantFormData({
                          color: "",
                          size: "",
                          price: "",
                          stock: "",
                        });
                        setShowVariantForm(true);
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg font-medium hover:bg-green-600 transition"
                    >
                      + Add Variant
                    </button>
                  </div>
                </div>
                {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Color</th>
                          <th className="px-4 py-2 text-left font-semibold">Size</th>
                          <th className="px-4 py-2 text-left font-semibold">Price</th>
                          <th className="px-4 py-2 text-left font-semibold">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedProduct.variants.map((variant) => (
                          <tr
                            key={variant.id}
                            className="hover:bg-blue-50 cursor-pointer transition"
                            onClick={() => handleEditVariant(variant)}
                          >
                            <td className="px-4 py-3">
                              <span className="inline-block w-6 h-6 rounded border"
                                style={{
                                  backgroundColor:
                                    variant.color.toLowerCase() === "white"
                                      ? "#f5f5f5"
                                      : variant.color.toLowerCase(),
                                }}
                                title={variant.color}
                              />
                              {" "}{variant.color}
                            </td>
                            <td className="px-4 py-3">{variant.size}</td>
                            <td className="px-4 py-3 font-medium">
                              {priceFmt.format(coercePrice(variant.price))}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${variant.stock > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {variant.stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No variants available</p>
                )}
              </div>
            </div>

            <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleEdit(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  handleDelete(selectedProduct.id);
                  setSelectedProduct(null);
                }}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Add/Edit Modal */}
      {showVariantForm && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedVariant ? "Edit Variant" : "Add New Variant"}
              </h2>
              <button
                onClick={handleCloseVariantForm}
                className="text-2xl leading-none hover:opacity-75 transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleVariantSubmit} className="p-6 space-y-4">
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Color *
                </label>
                <input
                  type="text"
                  value={variantFormData.color}
                  onChange={(e) =>
                    setVariantFormData({ ...variantFormData, color: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Size *
                </label>
                <input
                  type="text"
                  value={variantFormData.size}
                  onChange={(e) =>
                    setVariantFormData({ ...variantFormData, size: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Price (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variantFormData.price}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={variantFormData.stock}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, stock: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseVariantForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : selectedVariant ? "Update Variant" : "Create Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

