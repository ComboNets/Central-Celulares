import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Brand, PhoneFilters, PhoneWithBrand } from "@/types/products";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
  baseSha?: string | null;
}

interface PublishResponseBody {
  ok: boolean;
  commitSha: string;
  commitUrl: string;
  sha: string;
  products: PhoneWithBrand[];
}

const PENDING_PATCHES_STORAGE_KEY = "centralcelulares.admin.pending-patches.v1";
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
      headers: {
        Accept: "application/json",
      },
    });
    if (response.ok) {
      const data = (await response.json()) as
        | AdminProductsResponse
        | PhoneWithBrand[]
        | { products?: PhoneWithBrand[]; sha?: string | null };
      if (Array.isArray(data)) {
        return { products: data, sha: null };
      }
      if (Array.isArray(data.products)) {
        return { products: data.products, sha: data.sha ?? null };
      }
    }
  } catch {
    // fall through to static fallback
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
  selected: boolean;
  previewImage?: string;
  onOpenDetail: () => void;
  onEdit: () => void;
}

function AdminPhoneCard({ phone, selected, previewImage, onOpenDetail, onEdit }: AdminPhoneCardProps) {
  const hasDiscount = phone.sale_price && phone.sale_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.sale_price!) / phone.price) * 100)
    : 0;
  const imageSrc = previewImage || resolveImageSrc(phone.images?.[0]);

  return (
    <Card
      className={`card-hover overflow-hidden group cursor-pointer h-full ${
        selected ? "ring-2 ring-primary border-primary" : ""
      }`}
      role="link"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
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

        <div className="flex flex-wrap gap-1">
          {phone.storage_options?.slice(0, 3).map((storage) => (
            <Badge key={storage} variant="secondary" className="text-xs">
              {storage}
            </Badge>
          ))}
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function cloneProduct(product: PhoneWithBrand): PhoneWithBrand {
  return JSON.parse(JSON.stringify(product)) as PhoneWithBrand;
}

function applyChangesToPhone(phone: PhoneWithBrand, changes: PendingProductChanges): PhoneWithBrand {
  const next = cloneProduct(phone);
  if (changes.model !== undefined) next.model = changes.model;
  if (changes.price !== undefined) next.price = changes.price;
  if (changes.sale_price !== undefined) next.sale_price = changes.sale_price;
  if (changes.storage_options !== undefined) next.storage_options = changes.storage_options;
  if (changes.display_size !== undefined) next.display_size = changes.display_size;
  if (changes.processor !== undefined) next.processor = changes.processor;
  if (changes.ram !== undefined) next.ram = changes.ram;
  if (changes.camera !== undefined) next.camera = changes.camera;
  if (changes.battery !== undefined) next.battery = changes.battery;
  if (changes.release_year !== undefined) next.release_year = changes.release_year;
  if (changes.description !== undefined) next.description = changes.description;
  if (changes.images !== undefined) next.images = changes.images;
  if (changes.is_featured !== undefined) next.is_featured = changes.is_featured;
  if (changes.is_published !== undefined) next.is_published = changes.is_published;
  if (changes.brand_name !== undefined) {
    next.brand = { ...next.brand, name: changes.brand_name };
  }
  return next;
}

function applyPendingPatches(
  phones: PhoneWithBrand[],
  pendingPatches: Record<string, PendingProductChanges>
): PhoneWithBrand[] {
  return phones.map((phone) => {
    const patch = pendingPatches[phone.id];
    return patch ? applyChangesToPhone(phone, patch) : phone;
  });
}

function buildPendingChanges(base: PhoneWithBrand, draft: PhoneWithBrand): PendingProductChanges {
  const changes: PendingProductChanges = {};

  if (draft.model !== base.model) changes.model = draft.model;
  if (draft.price !== base.price) changes.price = draft.price;
  if (draft.sale_price !== base.sale_price) changes.sale_price = draft.sale_price;
  if (!arraysEqual(draft.storage_options, base.storage_options)) {
    changes.storage_options = draft.storage_options ?? [];
  }
  if (draft.display_size !== base.display_size) changes.display_size = draft.display_size;
  if (draft.processor !== base.processor) changes.processor = draft.processor;
  if (draft.ram !== base.ram) changes.ram = draft.ram;
  if (draft.camera !== base.camera) changes.camera = draft.camera;
  if (draft.battery !== base.battery) changes.battery = draft.battery;
  if (draft.release_year !== base.release_year) changes.release_year = draft.release_year;
  if (draft.description !== base.description) changes.description = draft.description;
  if (!arraysEqual(draft.images, base.images)) {
    changes.images = draft.images ?? [];
  }
  if (draft.is_featured !== base.is_featured) changes.is_featured = draft.is_featured;
  if (draft.is_published !== base.is_published) changes.is_published = draft.is_published;

  const draftBrandName = draft.brand?.name ?? "";
  const baseBrandName = base.brand?.name ?? "";
  if (draftBrandName !== baseBrandName) {
    changes.brand_name = draftBrandName;
  }

  return changes;
}

export default function AdminCatalog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<PhoneFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [draftPhones, setDraftPhones] = useState<PhoneWithBrand[] | null>(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [pendingPatches, setPendingPatches] = useState<Record<string, PendingProductChanges>>(
    readStoredPendingPatches
  );
  const [pushToken, setPushToken] = useState<string>(readStoredPushToken);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: sourceData, isLoading, isError } = useQuery({
    queryKey: ["phones", "admin", "raw"],
    queryFn: fetchAdminProducts,
  });
  const sourcePhones = sourceData?.products ?? null;
  const sourceSha = sourceData?.sha ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PENDING_PATCHES_STORAGE_KEY, JSON.stringify(pendingPatches));
  }, [pendingPatches]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pushToken) {
      window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);
    } else {
      window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  }, [pushToken]);

  useEffect(() => {
    if (sourcePhones) {
      const mergedPhones = applyPendingPatches(sourcePhones, pendingPatches);
      setDraftPhones(mergedPhones);
      setSelectedPhoneId((current) => {
        if (current && mergedPhones.some((phone) => phone.id === current)) {
          return current;
        }
        return mergedPhones[0]?.id ?? null;
      });
    }
  }, [sourcePhones, pendingPatches]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const updateFilter = <K extends keyof PhoneFilters>(key: K, value: PhoneFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const brands = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const phone of draftPhones || []) {
      if (phone.brand) {
        map.set(phone.brand.id, phone.brand);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [draftPhones]);

  const filteredPhones = useMemo(() => {
    if (!draftPhones) return [];
    return applyPhoneFilters(draftPhones, filters);
  }, [draftPhones, filters]);

  const selectedPhone = useMemo(() => {
    if (!draftPhones || !selectedPhoneId) return null;
    return draftPhones.find((phone) => phone.id === selectedPhoneId) || null;
  }, [draftPhones, selectedPhoneId]);

  const selectedSourcePhone = useMemo(() => {
    if (!sourcePhones || !selectedPhoneId) return null;
    return sourcePhones.find((phone) => phone.id === selectedPhoneId) || null;
  }, [sourcePhones, selectedPhoneId]);

  const selectedPendingPatch = selectedPhoneId ? pendingPatches[selectedPhoneId] : undefined;
  const pendingCount = Object.keys(pendingPatches).length;

  const updateSelectedPhone = (updater: (phone: PhoneWithBrand) => PhoneWithBrand) => {
    if (!selectedPhoneId) return;
    setDraftPhones((prev) =>
      prev?.map((phone) => (phone.id === selectedPhoneId ? updater(phone) : phone)) ?? prev
    );
  };
  const handleSaveLocal = () => {
    if (!selectedPhone || !selectedSourcePhone) return;
    const changes = buildPendingChanges(selectedSourcePhone, selectedPhone);
    if (Object.keys(changes).length === 0) {
      setPendingPatches((prev) => {
        if (!selectedPhoneId) return prev;
        if (!prev[selectedPhoneId]) return prev;
        const next = { ...prev };
        delete next[selectedPhoneId];
        return next;
      });
      toast({
        title: "Sin cambios pendientes",
        description: "No hay diferencias para guardar en la cola local.",
      });
      return;
    }

    setPendingPatches((prev) => ({
      ...prev,
      [selectedPhone.id]: changes,
    }));
    toast({
      title: "Cambios guardados localmente",
      description: "El producto se agregó a la cola local. Presiona Push para crear un solo commit.",
    });
  };

  const handlePushQueuedChanges = async () => {
    if (pendingCount === 0 || isPublishing) return;
    setIsPublishing(true);
    try {
      const payload: PublishRequestBody = {
        patches: Object.entries(pendingPatches).map(([id, changes]) => ({ id, changes })),
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
      setDraftPhones(result.products);
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

  const selectedImage = selectedPhoneId ? imagePreviews[selectedPhoneId] : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="main-content">
        <div className="container">
          <h1 className="page-title">Catálogo Admin</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Usa Guardar local para acumular cambios y Push para publicar todo en un solo commit a main.
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
                <Button
                  onClick={handlePushQueuedChanges}
                  disabled={pendingCount === 0 || isPublishing}
                >
                  {isPublishing ? "Publicando..." : `Push cambios (${pendingCount})`}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pendingCount === 0
                    ? "Sin cambios en cola"
                    : `${pendingCount} producto(s) en cola local`}
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
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                Ordenar por:
              </span>
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

            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {filteredPhones.length} celulares encontrados
                </p>
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
                      selected={phone.id === selectedPhoneId}
                      previewImage={imagePreviews[phone.id]}
                      onOpenDetail={() => navigate(`/phone/${phone.id}`)}
                      onEdit={() => setSelectedPhoneId(phone.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <p>No se encontraron celulares que coincidan con tus criterios.</p>
                </div>
              )}

              {selectedPhone && (
                <Card>
                  <CardContent className="p-6 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h2 className="font-display font-bold text-xl">Editando producto #{selectedPhone.id}</h2>
                        <p className="text-sm text-muted-foreground">
                          Edita campos y presiona Guardar local para agregar este producto a la cola.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPendingPatch && (
                          <Badge variant="secondary">En cola para Push</Badge>
                        )}
                        <Button onClick={handleSaveLocal} variant="secondary">
                          Guardar local
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input
                          value={selectedPhone.model}
                          onChange={(e) => updateSelectedPhone((phone) => ({ ...phone, model: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Marca (brand.name)</Label>
                        <Input
                          value={selectedPhone.brand.name}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              brand: { ...phone.brand, name: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Precio</Label>
                        <Input
                          type="number"
                          value={selectedPhone.price}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              price: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio oferta (sale_price)</Label>
                        <Input
                          type="number"
                          value={selectedPhone.sale_price ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              sale_price: parseOptionalNumber(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lanzamiento (release_year)</Label>
                        <Input
                          type="number"
                          value={selectedPhone.release_year ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              release_year: parseOptionalNumber(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <textarea
                        value={selectedPhone.description ?? ""}
                        onChange={(e) =>
                          updateSelectedPhone((phone) => ({
                            ...phone,
                            description: e.target.value || null,
                          }))
                        }
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pantalla (display_size)</Label>
                        <Input
                          value={selectedPhone.display_size ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              display_size: e.target.value || null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Procesador</Label>
                        <Input
                          value={selectedPhone.processor ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              processor: e.target.value || null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RAM</Label>
                        <Input
                          value={selectedPhone.ram ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              ram: e.target.value || null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cámara</Label>
                        <Input
                          value={selectedPhone.camera ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              camera: e.target.value || null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Batería</Label>
                        <Input
                          value={selectedPhone.battery ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              battery: e.target.value || null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Almacenamientos (storage_options, separados por coma)</Label>
                        <Input
                          value={selectedPhone.storage_options?.join(", ") ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              storage_options: e.target.value
                                .split(",")
                                .map((part) => part.trim())
                                .filter(Boolean),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ruta de imagen principal (images[0])</Label>
                        <Input
                          value={selectedPhone.images?.[0] ?? ""}
                          onChange={(e) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              images: [e.target.value, ...(phone.images?.slice(1) || [])].filter(Boolean),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reemplazar imagen local (vista previa)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || !selectedPhoneId) return;
                            setImagePreviews((prev) => {
                              const old = prev[selectedPhoneId];
                              if (old) URL.revokeObjectURL(old);
                              return { ...prev, [selectedPhoneId]: URL.createObjectURL(file) };
                            });
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              images: [`/images/fotos/${file.name}`, ...(phone.images?.slice(1) || [])],
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="admin-is-featured"
                          checked={selectedPhone.is_featured}
                          onCheckedChange={(checked) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              is_featured: checked === true,
                            }))
                          }
                        />
                        <Label htmlFor="admin-is-featured">is_featured</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="admin-is-published"
                          checked={selectedPhone.is_published}
                          onCheckedChange={(checked) =>
                            updateSelectedPhone((phone) => ({
                              ...phone,
                              is_published: checked === true,
                            }))
                          }
                        />
                        <Label htmlFor="admin-is-published">is_published</Label>
                      </div>
                    </div>

                    {selectedImage && (
                      <div className="space-y-2">
                        <Label>Vista previa de nueva foto</Label>
                        <img
                          src={selectedImage}
                          alt={`Vista previa ${selectedPhone.model}`}
                          className="h-48 w-48 object-cover rounded-md border"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
