export type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  shop: string;
  vendor: string;
  stock: number;
  images: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  tags: string[];
  specs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  search?: string;
  sort?: 'price' | '-price' | 'rating' | '-rating' | 'newest';
}; 