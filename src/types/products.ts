export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Phone {
  id: string;
  brand_id: string;
  model: string;
  price: number;
  sale_price: number | null;
  storage_options: string[] | null;
  display_size: string | null;
  processor: string | null;
  ram: string | null;
  camera: string | null;
  battery: string | null;
  release_year: number | null;
  description: string | null;
  images: string[] | null;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
  brand?: Brand;
}

export interface PhoneWithBrand extends Phone {
  brand: Brand;
}

export interface PhoneFilters {
  search?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  storage?: string[];
  releaseYear?: number[];
  sortBy?: "price_asc" | "price_desc" | "newest" | "popular";
}
