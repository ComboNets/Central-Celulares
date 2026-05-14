import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

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

const PUSH_TOKEN_STORAGE_KEY = "centralcelulares.admin.push-token.v1";

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

function readStoredPushToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) || "";
}

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<NewProductFormState>(INITIAL_FORM_STATE);
  const [pushToken, setPushToken] = useState<string>(readStoredPushToken);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pushToken) {
      window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);
    } else {
      window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  }, [pushToken]);

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
        title: "Precio inválido",
        description: "Ingresa un precio válido mayor o igual a 0.",
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
          title: "Precio oferta inválido",
          description: "Ingresa un precio de oferta válido o déjalo vacío.",
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
          title: "Año inválido",
          description: "El año de lanzamiento debe ser un número entero.",
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (pushToken.trim()) {
        headers.Authorization = `Bearer ${pushToken.trim()}`;
      }

      const response = await fetch("/api/products/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ creates: [payload] }),
      });

      if (!response.ok) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/admin/catalog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="page-title mb-0">Agregar producto</h1>
          <Button onClick={handleCreateProduct} disabled={isSubmitting}>
            {isSubmitting ? "Agregando..." : "Crear y publicar"}
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-2 max-w-md">
              <Label htmlFor="push-token">Token push (opcional)</Label>
              <Input
                id="push-token"
                type="password"
                placeholder="Bearer token para /api/products/publish"
                value={pushToken}
                onChange={(e) => setPushToken(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ID *</Label>
                <Input value={form.id} onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input
                  value={form.brand_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, brand_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio oferta</Label>
                <Input
                  type="number"
                  value={form.sale_price}
                  onChange={(e) => setForm((prev) => ({ ...prev, sale_price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Año lanzamiento</Label>
                <Input
                  type="number"
                  value={form.release_year}
                  onChange={(e) => setForm((prev) => ({ ...prev, release_year: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Almacenamientos (coma separada)</Label>
                <Input
                  value={form.storage_options}
                  onChange={(e) => setForm((prev) => ({ ...prev, storage_options: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ruta imagen principal</Label>
                <Input
                  value={form.image_path}
                  onChange={(e) => setForm((prev) => ({ ...prev, image_path: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pantalla</Label>
                <Input
                  value={form.display_size}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_size: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Procesador</Label>
                <Input
                  value={form.processor}
                  onChange={(e) => setForm((prev) => ({ ...prev, processor: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>RAM</Label>
                <Input
                  value={form.ram}
                  onChange={(e) => setForm((prev) => ({ ...prev, ram: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cámara</Label>
                <Input
                  value={form.camera}
                  onChange={(e) => setForm((prev) => ({ ...prev, camera: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Batería</Label>
                <Input
                  value={form.battery}
                  onChange={(e) => setForm((prev) => ({ ...prev, battery: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-is-featured"
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_featured: checked === true }))}
                />
                <Label htmlFor="add-is-featured">is_featured</Label>
              </div>
              <div className="flex items-center gap-2">
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
  );
}
