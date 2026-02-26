import { Navbar } from "@/components/Navbar";
import { PhoneCard } from "@/components/PhoneCard";
import { usePhones, useBrands } from "@/hooks/usePhones";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { PhoneFilters } from "@/types/products";

export default function Catalog() {
  const [filters, setFilters] = useState<PhoneFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { data: phones, isLoading } = usePhones(filters);
  const { data: brands } = useBrands();

  const updateFilter = <K extends keyof PhoneFilters>(key: K, value: PhoneFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="main-content">
        <div className="container">
          <h1 className="page-title">Celulares</h1>

          {/* Keep modern filters but inside a controls row */}
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
          {/* Filters Sidebar */}
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
                    {brands?.map((brand) => (
                      <div key={brand.id} className="flex items-center gap-2">
                        <Checkbox
                          id={brand.id}
                          checked={filters.brands?.includes(brand.id)}
                          onCheckedChange={(checked) => {
                            const current = filters.brands || [];
                            updateFilter(
                              "brands",
                              checked ? [...current, brand.id] : current.filter((id) => id !== brand.id)
                            );
                          }}
                        />
                        <Label htmlFor={brand.id} className="text-sm cursor-pointer">{brand.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Ordenar por</Label>
                  <Select value={filters.sortBy || ""} onValueChange={(v) => updateFilter("sortBy", v as PhoneFilters["sortBy"])}>
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

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {phones?.length || 0} celulares encontrados
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
            ) : phones && phones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {phones.map((phone) => (
                  <PhoneCard key={phone.id} phone={phone} />
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
