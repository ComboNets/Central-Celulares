import { useQuery } from "@tanstack/react-query";
import type { PhoneWithBrand, PhoneFilters, Brand } from "@/types/products";

async function fetchPhonesFromJson(): Promise<PhoneWithBrand[]> {
  const url = `${import.meta.env.BASE_URL}data/products.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load products.json");
  }
  return (await response.json()) as PhoneWithBrand[];
}

function applyPhoneFilters(phones: PhoneWithBrand[], filters?: PhoneFilters): PhoneWithBrand[] {
  let result = phones.filter((p) => p.is_published);

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    result = result.filter((p) =>
      p.model.toLowerCase().includes(term) || (p.description || "").toLowerCase().includes(term)
    );
  }

  if (filters?.brands && filters.brands.length > 0) {
    result = result.filter((p) => filters.brands!.includes(p.brand_id));
  }

  if (filters?.minPrice !== undefined) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }

  if (filters?.maxPrice !== undefined) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters?.releaseYear && filters.releaseYear.length > 0) {
    result = result.filter((p) => p.release_year && filters.releaseYear!.includes(p.release_year));
  }

  switch (filters?.sortBy) {
    case "price_asc":
      result = [...result].sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      result = [...result].sort((a, b) => b.price - a.price);
      break;
    case "newest":
      result = [...result].sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
      break;
    case "popular":
      result = [...result].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      break;
    default:
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  return result;
}

export function usePhones(filters?: PhoneFilters) {
  return useQuery({
    queryKey: ["phones", filters],
    queryFn: async () => {
      const phones = await fetchPhonesFromJson();
      return applyPhoneFilters(phones, filters);
    },
  });
}

export function usePhone(id: string | undefined) {
  return useQuery({
    queryKey: ["phone", id],
    queryFn: async () => {
      if (!id) return null;
      const phones = await fetchPhonesFromJson();
      return phones.find((p) => p.id === id) || null;
    },
    enabled: !!id,
  });
}

export function useFeaturedPhones() {
  return useQuery({
    queryKey: ["phones", "featured"],
    queryFn: async () => {
      const phones = await fetchPhonesFromJson();
      return phones.filter((p) => p.is_published && p.is_featured).slice(0, 6);
    },
  });
}

export function useSalePhones() {
  return useQuery({
    queryKey: ["phones", "sale"],
    queryFn: async () => {
      const phones = await fetchPhonesFromJson();
      return phones.filter((p) => p.is_published && p.sale_price !== null).slice(0, 8);
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const phones = await fetchPhonesFromJson();
      const map = new Map<string, Brand>();

      for (const phone of phones) {
        if (phone.brand) {
          map.set(phone.brand.id, phone.brand);
        }
      }

      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
