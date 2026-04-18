import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  onSelect: () => void;
}

function AdminPhoneCard({ phone, selected, previewImage, onSelect }: AdminPhoneCardProps) {
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

export default function AdminCatalog() {
  const [filters, setFilters] = useState<PhoneFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [draftPhones, setDraftPhones] = useState<PhoneWithBrand[] | null>(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const { data: sourcePhones, isLoading, isError } = useQuery({
    queryKey: ["phones", "admin", "raw"],
    queryFn: fetchPhonesFromJson,
  });

  useEffect(() => {
    if (sourcePhones && !draftPhones) {
      setDraftPhones(sourcePhones);
      setSelectedPhoneId(sourcePhones[0]?.id ?? null);
    }
  }, [sourcePhones, draftPhones]);

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

  const updateSelectedPhone = (updater: (phone: PhoneWithBrand) => PhoneWithBrand) => {
    if (!selectedPhoneId) return;
    setDraftPhones((prev) =>
      prev?.map((phone) => (phone.id === selectedPhoneId ? updater(phone) : phone)) ?? prev
    );
  };

  const selectedImage = selectedPhoneId ? imagePreviews[selectedPhoneId] : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="main-content">
        <div className="container">
          <h1 className="page-title">Catálogo Admin</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Esta vista replica el catálogo y permite editar localmente los campos del producto. Aún no guarda cambios.
          </p>

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
                      onSelect={() => setSelectedPhoneId(phone.id)}
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
                    <div>
                      <h2 className="font-display font-bold text-xl">Editando producto #{selectedPhone.id}</h2>
                      <p className="text-sm text-muted-foreground">
                        Cambios locales de vista previa. No se guarda nada todavía.
                      </p>
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
