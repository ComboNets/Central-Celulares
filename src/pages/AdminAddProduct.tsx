import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuthActions } from "@/hooks/useAdminAuth";
import { ArrowLeft, Battery, Camera, Calendar, Cpu, HardDrive, LogOut, Monitor } from "lucide-react";

interface CreateProductRequest {
  id: string;
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
  brand_name: string;
}

interface PublishResponseBody {
  ok: boolean;
  commitSha: string;
  commitUrl: string;
}

interface NewProductFormState {
  id: string;
  brand_name: string;
  model: string;
  price: string;
  sale_price: string;
  storage_options: string;
  display_size: string;
  processor: string;
  ram: string;
  camera: string;
  battery: string;
  release_year: string;
  description: string;
  image_path: string;
  is_featured: boolean;
  is_published: boolean;
}

const INITIAL_FORM_STATE: NewProductFormState = {
  id: "",
  brand_name: "",
  model: "",
  price: "",
  sale_price: "",
  storage_options: "",
  display_size: "",
  processor: "",
  ram: "",
  camera: "",
  battery: "",
  release_year: "",
  description: "",
  image_path: "",
  is_featured: false,
  is_published: true,
};

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAdminAuthActions();

  const [form, setForm] = useState<NewProductFormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProduct = async () => {
    if (isSubmitting) return;

    const productId = form.id.trim();
    const brandName = form.brand_name.trim();
    const model = form.model.trim();

    if (!productId || !brandName || !model) {
      toast({
        title: "Faltan datos requeridos",
        description: "Completa ID, Marca y Modelo.",
        variant: "destructive",
      });
      return;
    }

    const parsedPrice = Number(form.price.trim());
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast({
        title: "Precio invalido",
        description: "Ingresa un precio valido mayor o igual a 0.",
        variant: "destructive",
      });
      return;
    }

    const salePriceRaw = form.sale_price.trim();
    let salePrice: number | null = null;
    if (salePriceRaw) {
      const parsedSalePrice = Number(salePriceRaw);
      if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
        toast({
          title: "Precio oferta invalido",
          description: "Ingresa un precio de oferta valido o dejalo vacio.",
          variant: "destructive",
        });
        return;
      }
      salePrice = parsedSalePrice;
    }

    const releaseYearRaw = form.release_year.trim();
    let releaseYear: number | null = null;
    if (releaseYearRaw) {
      const parsedReleaseYear = Number(releaseYearRaw);
      if (!Number.isInteger(parsedReleaseYear)) {
        toast({
          title: "Anio invalido",
          description: "El anio de lanzamiento debe ser un numero entero.",
          variant: "destructive",
        });
        return;
      }
      releaseYear = parsedReleaseYear;
    }

    const storageOptions = form.storage_options
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    const imagePath = form.image_path.trim();
    const payload: CreateProductRequest = {
      id: productId,
      brand_name: brandName,
      model,
      price: parsedPrice,
      sale_price: salePrice,
      storage_options: storageOptions.length > 0 ? storageOptions : null,
      display_size: form.display_size.trim() || null,
      processor: form.processor.trim() || null,
      ram: form.ram.trim() || null,
      camera: form.camera.trim() || null,
      battery: form.battery.trim() || null,
      release_year: releaseYear,
      description: form.description.trim() || null,
      images: imagePath ? [imagePath] : [],
      is_featured: form.is_featured,
      is_published: form.is_published,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/products/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creates: [payload] }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/login", { replace: true, state: { from: "/admin/product/new" } });
        }
        const errorText = (await response.text()).trim();
        let errorMessage = errorText || "No se pudo agregar el producto.";
        try {
          const parsed = JSON.parse(errorText) as { error?: string };
          if (parsed.error) errorMessage = parsed.error;
        } catch {
          // fallback to raw response text
        }
        throw new Error(errorMessage);
      }

      const result = (await response.json()) as PublishResponseBody;
      toast({
        title: "Producto agregado",
        description: `Commit ${result.commitSha.slice(0, 7)} creado en main.`,
      });
      setForm(INITIAL_FORM_STATE);
      navigate(`/admin/phone/${productId}`);
    } catch (error) {
      toast({
        title: "No se pudo agregar el producto",
        description: error instanceof Error ? error.message : "Error inesperado al crear el producto.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/admin/catalog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catalogo
        </Link>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="page-title mb-0">Agregar producto</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCreateProduct} disabled={isSubmitting}>
              {isSubmitting ? "Agregando..." : "Crear y publicar"}
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden">
            {form.image_path.trim() ? (
              <img src={form.image_path.trim()} alt={form.model || "Nuevo producto"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center text-muted-foreground">
                <Camera className="mb-3 h-10 w-10 text-primary/70" />
                <p className="text-sm font-medium">Vista previa de imagen</p>
                <p className="mt-1 text-xs">Agrega una ruta como /images/fotos/p-nuevo.jpg</p>
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {form.is_featured && <span className="featured-badge">Destacado</span>}
              {form.sale_price && <span className="sale-badge">Oferta</span>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input
                  value={form.brand_name}
                  placeholder="Ej: Xiaomi"
                  onChange={(e) => setForm((prev) => ({ ...prev, brand_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input
                  value={form.model}
                  placeholder="Ej: Redmi Note 14 128GB"
                  onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID *</Label>
              <Input
                value={form.id}
                placeholder="Ej: 65"
                onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio *</Label>
                <Input
                  type="number"
                  value={form.price}
                  placeholder="Ej: 1190000"
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio oferta</Label>
                <Input
                  type="number"
                  value={form.sale_price}
                  placeholder="Ej: 1090000"
                  onChange={(e) => setForm((prev) => ({ ...prev, sale_price: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Almacenamientos (coma separada)</Label>
              <Input
                value={form.storage_options}
                placeholder="Ej: 128GB, 256GB"
                onChange={(e) => setForm((prev) => ({ ...prev, storage_options: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <textarea
                value={form.description}
                placeholder="Ej: Celular nuevo con excelente bateria, buena camara y rendimiento fluido."
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Ruta imagen principal</Label>
              <Input
                value={form.image_path}
                placeholder="/images/fotos/p-65.jpg"
                onChange={(e) => setForm((prev) => ({ ...prev, image_path: e.target.value }))}
              />
            </div>

            <Separator className="my-4" />

            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-bold text-lg mb-4">Especificaciones</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Pantalla</Label>
                    <Input
                      value={form.display_size}
                      placeholder="Ej: 6.7&quot; AMOLED"
                      onChange={(e) => setForm((prev) => ({ ...prev, display_size: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Cpu className="w-4 h-4" /> Procesador</Label>
                    <Input
                      value={form.processor}
                      placeholder="Ej: Snapdragon 7s Gen 2"
                      onChange={(e) => setForm((prev) => ({ ...prev, processor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> RAM</Label>
                    <Input
                      value={form.ram}
                      placeholder="Ej: 8GB"
                      onChange={(e) => setForm((prev) => ({ ...prev, ram: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Camara</Label>
                    <Input
                      value={form.camera}
                      placeholder="Ej: Trasera 108MP; Frontal 16MP"
                      onChange={(e) => setForm((prev) => ({ ...prev, camera: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Battery className="w-4 h-4" /> Bateria</Label>
                    <Input
                      value={form.battery}
                      placeholder="Ej: 5000mAh"
                      onChange={(e) => setForm((prev) => ({ ...prev, battery: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Lanzamiento</Label>
                    <Input
                      type="number"
                      value={form.release_year}
                      placeholder="Ej: 2025"
                      onChange={(e) => setForm((prev) => ({ ...prev, release_year: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center gap-2 rounded-md px-2 py-1">
                    <Checkbox
                      id="add-is-featured"
                      checked={form.is_featured}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_featured: checked === true }))}
                    />
                    <Label htmlFor="add-is-featured">is_featured</Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1">
                    <Checkbox
                      id="add-is-published"
                      checked={form.is_published}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_published: checked === true }))}
                    />
                    <Label htmlFor="add-is-published">is_published</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
