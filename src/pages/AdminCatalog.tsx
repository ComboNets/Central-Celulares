import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Brand, PhoneFilters, PhoneWithBrand } from "@/types/products";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface AdminProductsResponse {
  products: PhoneWithBrand[];
  sha: string | null;
}

interface PendingProductChanges {
  model?: string;
  price?: number;
  sale_price?: number | null;
  storage_options?: string[] | null;
  display_size?: string | null;
  processor?: string | null;
  ram?: string | null;
  camera?: string | null;
  battery?: string | null;
  release_year?: number | null;
  description?: string | null;
  images?: string[] | null;
  is_featured?: boolean;
  is_published?: boolean;
  brand_name?: string;
}

interface PublishRequestBody {
  patches: Array<{
    id: string;
    changes: PendingProductChanges;
  }>;
  imageUploads?: PendingImageUpload[];
  baseSha?: string | null;
}

interface PublishResponseBody {
  ok: boolean;
  commitSha: string;
  commitUrl: string;
  sha: string;
  products: PhoneWithBrand[];
}

interface PendingImageUpload {
  id: string;
  extension: string;
  mimeType: string;
  contentBase64: string;
}

const PENDING_PATCHES_STORAGE_KEY = "centralcelulares.admin.pending-patches.v1";
const PENDING_IMAGE_UPLOADS_STORAGE_KEY = "centralcelulares.admin.pending-image-uploads.v1";
const PUSH_TOKEN_STORAGE_KEY = "centralcelulares.admin.push-token.v1";

function readStoredPendingPatches(): Record<string, PendingProductChanges> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PENDING_PATCHES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PendingProductChanges>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStoredPushToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) || "";
}

function readStoredPendingImageUploads(): Record<string, PendingImageUpload> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PENDING_IMAGE_UPLOADS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PendingImageUpload>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function fetchFallbackProductsJson(): Promise<PhoneWithBrand[]> {
  const fallbackUrl = `${import.meta.env.BASE_URL}data/products.json`;
  const response = await fetch(fallbackUrl);
  if (!response.ok) {
    throw new Error("Failed to load products.json");
  }
  return (await response.json()) as PhoneWithBrand[];
}

async function fetchAdminProducts(): Promise<AdminProductsResponse> {
  try {
    const response = await fetch("/api/products", {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as
        | AdminProductsResponse
        | PhoneWithBrand[]
        | { products?: PhoneWithBrand[]; sha?: string | null };
      if (Array.isArray(data)) return { products: data, sha: null };
      if (Array.isArray(data.products)) return { products: data.products, sha: data.sha ?? null };
    }
  } catch {
    // fallback below
  }
  return { products: await fetchFallbackProductsJson(), sha: null };
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

function resolveImageSrc(rawImage?: string): string | undefined {
  if (!rawImage) return undefined;
  if (rawImage.startsWith("http") || rawImage.startsWith("blob:")) return rawImage;
  const baseUrl = import.meta.env.BASE_URL || "/";
  return `${baseUrl.replace(/\/$/, "")}/${rawImage.replace(/^\//, "")}`;
}

interface AdminPhoneCardProps {
  phone: PhoneWithBrand;
  queued: boolean;
  onSelect: () => void;
}

function AdminPhoneCard({ phone, queued, onSelect }: AdminPhoneCardProps) {
  const hasDiscount = phone.sale_price && phone.sale_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.sale_price!) / phone.price) * 100)
    : 0;
  const imageSrc = resolveImageSrc(phone.images?.[0]);
  const cardHighlightClass = queued ? "ring-2 ring-primary/70" : "";

  return (
    <Card
      className={`card-hover overflow-hidden group cursor-pointer h-full ${cardHighlightClass}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={phone.model}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {phone.is_featured && <span className="featured-badge">Destacado</span>}
          {hasDiscount && <span className="sale-badge">-{discountPercent}%</span>}
          {queued && <span className="rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground">En cola</span>}
        </div>
      </div>

      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {phone.brand?.name}
        </p>
        <h3 className="font-display font-semibold text-lg mb-2 line-clamp-1">{phone.model}</h3>
        <div className="flex items-center gap-2 mb-3">
          {hasDiscount ? (
            <>
              <span className="text-xl font-bold text-primary">${phone.sale_price?.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground line-through">${phone.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-xl font-bold">${phone.price.toFixed(2)}</span>
          )}
        </div>
        <p className="text-xs text-primary underline underline-offset-2">Abrir y editar</p>
      </CardContent>
    </Card>
  );
}

export default function AdminCatalog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filters, setFilters] = useState<PhoneFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [pendingPatches, setPendingPatches] = useState<Record<string, PendingProductChanges>>(
    readStoredPendingPatches
  );
  const [pendingImageUploads, setPendingImageUploads] = useState<Record<string, PendingImageUpload>>(
    readStoredPendingImageUploads
  );
  const [pushToken, setPushToken] = useState<string>(readStoredPushToken);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: sourceData, isLoading, isError } = useQuery({
    queryKey: ["phones", "admin", "raw"],
    queryFn: fetchAdminProducts,
  });
  const sourcePhones = sourceData?.products ?? [];
  const sourceSha = sourceData?.sha ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PENDING_PATCHES_STORAGE_KEY, JSON.stringify(pendingPatches));
  }, [pendingPatches]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PENDING_IMAGE_UPLOADS_STORAGE_KEY, JSON.stringify(pendingImageUploads));
  }, [pendingImageUploads]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pushToken) {
      window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);
    } else {
      window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  }, [pushToken]);

  const updateFilter = <K extends keyof PhoneFilters>(key: K, value: PhoneFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const brands = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const phone of sourcePhones) {
      if (phone.brand) {
        map.set(phone.brand.id, phone.brand);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sourcePhones]);

  const filteredPhones = useMemo(() => {
    return applyPhoneFilters(sourcePhones, filters);
  }, [sourcePhones, filters]);

  const queuedProductIds = new Set<string>([
    ...Object.keys(pendingPatches),
    ...Object.keys(pendingImageUploads),
  ]);
  const pendingCount = queuedProductIds.size;

  const handlePushQueuedChanges = async () => {
    if (pendingCount === 0 || isPublishing) return;
    setIsPublishing(true);
    try {
      const payload: PublishRequestBody = {
        patches: Object.entries(pendingPatches).map(([id, changes]) => ({ id, changes })),
        imageUploads: Object.values(pendingImageUploads),
        baseSha: sourceSha,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (pushToken.trim()) {
        headers.Authorization = `Bearer ${pushToken.trim()}`;
      }

      const response = await fetch("/api/products/publish", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "No se pudo publicar los cambios.");
      }

      const result = (await response.json()) as PublishResponseBody;
      setPendingPatches({});
      setPendingImageUploads({});
      queryClient.setQueryData<AdminProductsResponse>(["phones", "admin", "raw"], {
        products: result.products,
        sha: result.sha,
      });
      toast({
        title: "Push completado",
        description: `Commit ${result.commitSha.slice(0, 7)} creado en main.`,
      });
    } catch (error) {
      toast({
        title: "Push falló",
        description: error instanceof Error ? error.message : "No se pudo publicar los cambios.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="main-content">
        <div className="container">
          <h1 className="page-title">Catálogo Admin</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Haz clic en un producto para editarlo en la vista de detalle (mismo diseño de showcase).
          </p>

          <div className="mb-6 rounded-lg border bg-card p-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="w-full lg:max-w-sm space-y-2">
                <Label htmlFor="push-token">Token push (opcional)</Label>
                <Input
                  id="push-token"
                  type="password"
                  placeholder="Bearer token para /api/products/publish"
                  value={pushToken}
                  onChange={(e) => setPushToken(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handlePushQueuedChanges} disabled={pendingCount === 0 || isPublishing}>
                  {isPublishing ? "Publicando..." : `Push cambios (${pendingCount})`}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pendingCount === 0 ? "Sin cambios en cola" : `${pendingCount} producto(s) en cola local`}
                </span>
              </div>
            </div>
          </div>

          <div className="controls mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  className="pl-10"
                  value={filters.search || ""}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">Ordenar por:</span>
              <Select
                value={filters.sortBy || ""}
                onValueChange={(v) => updateFilter("sortBy", v as PhoneFilters["sortBy"])}
              >
                <SelectTrigger className="w-[200px] sort-select border border-primary/40">
                  <SelectValue placeholder="Por defecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                  <SelectItem value="popular">Más populares</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                <X className="w-4 h-4 mr-1" /> Limpiar
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <aside className={`md:w-64 shrink-0 ${showFilters ? "block" : "hidden md:block"}`}>
              <div className="sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg">Filtros</h2>
                  <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                    Borrar todo
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar celulares..."
                      className="pl-10"
                      value={filters.search || ""}
                      onChange={(e) => updateFilter("search", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Marcas</Label>
                    <div className="space-y-2">
                      {brands.map((brand) => (
                        <div key={brand.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`admin-brand-${brand.id}`}
                            checked={filters.brands?.includes(brand.id)}
                            onCheckedChange={(checked) => {
                              const current = filters.brands || [];
                              updateFilter(
                                "brands",
                                checked ? [...current, brand.id] : current.filter((id) => id !== brand.id)
                              );
                            }}
                          />
                          <Label htmlFor={`admin-brand-${brand.id}`} className="text-sm cursor-pointer">
                            {brand.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Ordenar por</Label>
                    <Select
                      value={filters.sortBy || ""}
                      onValueChange={(v) => updateFilter("sortBy", v as PhoneFilters["sortBy"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Por defecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Más recientes primero</SelectItem>
                        <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                        <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                        <SelectItem value="popular">Más populares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">{filteredPhones.length} celulares encontrados</p>
                <Button variant="outline" className="md:hidden" onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-secondary animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-16 text-destructive">
                  <p>No se pudo cargar products.json.</p>
                </div>
              ) : filteredPhones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPhones.map((phone) => (
                    <AdminPhoneCard
                      key={phone.id}
                      phone={phone}
                      queued={queuedProductIds.has(phone.id)}
                      onSelect={() => navigate(`/phone/${phone.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <p>No se encontraron celulares que coincidan con tus criterios.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
