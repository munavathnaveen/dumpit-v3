export interface Product {
  _id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  price: number;
  units: string;
  stock: number;
  discount: number;
  rating: number;
  image: string;
  vendor: {
    _id: string;
    name: string;
  };
  shop: {
    _id: string;
    name: string;
  };
  reviews: Array<{
    user: {
      _id: string;
      name: string;
      avatar_url?: string;
    };
    rating: number;
    text: string;
    createdAt: string;
  }>;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  query?: string;
} 