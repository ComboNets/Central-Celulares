import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { PhoneWithBrand } from "@/types/products";
import { ArrowLeft, Battery, Camera, Calendar, Cpu, HardDrive, Monitor } from "lucide-react";

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
const SESSION_EDITED_FIELDS_STORAGE_KEY = "centralcelulares.admin.session-edited-fields.v1";
const EDITED_FIELD_CLASSNAME = "border-amber-500 bg-amber-100/40 ring-1 ring-amber-400/60";

type SessionEditedFields = Record<string, string[]>;

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

function readSessionEditedFields(): SessionEditedFields {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_EDITED_FIELDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionEditedFields;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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
  if (changes.brand_name !== undefined) next.brand = { ...next.brand, name: changes.brand_name };
  return next;
}

function buildPendingChanges(base: PhoneWithBrand, draft: PhoneWithBrand): PendingProductChanges {
  const changes: PendingProductChanges = {};
  if (draft.model !== base.model) changes.model = draft.model;
  if (draft.price !== base.price) changes.price = draft.price;
  if (draft.sale_price !== base.sale_price) changes.sale_price = draft.sale_price;
  if (!arraysEqual(draft.storage_options, base.storage_options)) changes.storage_options = draft.storage_options ?? [];
  if (draft.display_size !== base.display_size) changes.display_size = draft.display_size;
  if (draft.processor !== base.processor) changes.processor = draft.processor;
  if (draft.ram !== base.ram) changes.ram = draft.ram;
  if (draft.camera !== base.camera) changes.camera = draft.camera;
  if (draft.battery !== base.battery) changes.battery = draft.battery;
  if (draft.release_year !== base.release_year) changes.release_year = draft.release_year;
  if (draft.description !== base.description) changes.description = draft.description;
  if (!arraysEqual(draft.images, base.images)) changes.images = draft.images ?? [];
  if (draft.is_featured !== base.is_featured) changes.is_featured = draft.is_featured;
  if (draft.is_published !== base.is_published) changes.is_published = draft.is_published;
  if ((draft.brand?.name ?? "") !== (base.brand?.name ?? "")) changes.brand_name = draft.brand?.name ?? "";
  return changes;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function resolveImageSrc(rawImage?: string): string | undefined {
  if (!rawImage) return undefined;
  if (rawImage.startsWith("http") || rawImage.startsWith("blob:")) return rawImage;
  const baseUrl = import.meta.env.BASE_URL || "/";
  return `${baseUrl.replace(/\/$/, "")}/${rawImage.replace(/^\//, "")}`;
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
    const response = await fetch("/api/products", { headers: { Accept: "application/json" } });
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

export default function AdminPhoneDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [pendingPatches, setPendingPatches] = useState<Record<string, PendingProductChanges>>(readStoredPendingPatches);
  const [pushToken, setPushToken] = useState<string>(readStoredPushToken);
  const [sessionEditedFields, setSessionEditedFields] = useState<SessionEditedFields>(readSessionEditedFields);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftPhone, setDraftPhone] = useState<PhoneWithBrand | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: sourceData, isLoading, isError } = useQuery({
    queryKey: ["phones", "admin", "raw"],
    queryFn: fetchAdminProducts,
  });
  const sourcePhones = sourceData?.products ?? [];
  const sourceSha = sourceData?.sha ?? null;

  const sourcePhone = useMemo(() => sourcePhones.find((phone) => phone.id === id) || null, [sourcePhones, id]);
  const pendingCount = Object.keys(pendingPatches).length;
  const selectedPatch = id ? pendingPatches[id] : undefined;
  const liveChanges = useMemo(
    () => (sourcePhone && draftPhone ? buildPendingChanges(sourcePhone, draftPhone) : {}),
    [sourcePhone, draftPhone]
  );
  const editedKeysThisSession = new Set<string>(id ? sessionEditedFields[id] ?? [] : []);
  const liveChangedKeys = new Set<string>(Object.keys(liveChanges));
  const isFieldEdited = (fieldKey: keyof PendingProductChanges) =>
    editedKeysThisSession.has(fieldKey) || liveChangedKeys.has(fieldKey);
  const fieldClassName = (fieldKey: keyof PendingProductChanges) =>
    isFieldEdited(fieldKey) ? EDITED_FIELD_CLASSNAME : "";

  useEffect(() => {
    if (!sourcePhone) {
      setDraftPhone(null);
      return;
    }
    const patch = id ? pendingPatches[id] : undefined;
    setDraftPhone(patch ? applyChangesToPhone(sourcePhone, patch) : cloneProduct(sourcePhone));
  }, [sourcePhone, pendingPatches, id]);

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
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(SESSION_EDITED_FIELDS_STORAGE_KEY, JSON.stringify(sessionEditedFields));
  }, [sessionEditedFields]);

  useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  const handleSaveLocal = () => {
    if (!id || !draftPhone || !sourcePhone) return;
    const changes = buildPendingChanges(sourcePhone, draftPhone);
    if (Object.keys(changes).length === 0) {
      setPendingPatches((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSessionEditedFields((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast({
        title: "Sin cambios pendientes",
        description: "No hay diferencias para guardar en la cola local.",
      });
      return;
    }

    setPendingPatches((prev) => ({ ...prev, [id]: changes }));
    setSessionEditedFields((prev) => {
      const current = prev[id] ?? [];
      const merged = Array.from(new Set([...current, ...Object.keys(changes)]));
      return { ...prev, [id]: merged };
    });
    toast({
      title: "Cambios guardados localmente",
      description: "Este producto quedó en cola para el próximo Push.",
    });
  };

  const handlePushQueuedChanges = async () => {
    if (pendingCount === 0 || isPublishing) return;
    setIsPublishing(true);
    try {
      const payload: PublishRequestBody = {
        patches: Object.entries(pendingPatches).map(([productId, changes]) => ({
          id: productId,
          changes,
        })),
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-96 bg-secondary rounded-xl" />
            <div className="h-8 w-1/2 bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !draftPhone) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
          <Link to="/catalog">
            <Button>Volver al catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = draftPhone.sale_price && draftPhone.sale_price < draftPhone.price;
  const discountPercent = hasDiscount
    ? Math.round(((draftPhone.price - draftPhone.sale_price!) / draftPhone.price) * 100)
    : 0;

  const mainImage = previewImage || resolveImageSrc(draftPhone.images?.[0]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

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
              <Button onClick={handleSaveLocal} variant="secondary">
                Guardar local
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedPatch ? "Este producto está en cola" : "Sin guardar local para este producto"}
              </span>
              {editedKeysThisSession.size > 0 ? (
                <span className="text-sm font-medium text-amber-700 bg-amber-100/60 rounded px-2 py-1">
                  Editado en esta sesión
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={draftPhone.model} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sin imagen</div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {draftPhone.is_featured && <span className="featured-badge">Destacado</span>}
              {hasDiscount && <span className="sale-badge">-{discountPercent}% dto.</span>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  className={fieldClassName("brand_name")}
                  value={draftPhone.brand?.name ?? ""}
                  onChange={(e) =>
                    setDraftPhone((prev) =>
                      prev ? { ...prev, brand: { ...prev.brand, name: e.target.value } } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  className={fieldClassName("model")}
                  value={draftPhone.model}
                  onChange={(e) => setDraftPhone((prev) => (prev ? { ...prev, model: e.target.value } : prev))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  className={fieldClassName("price")}
                  type="number"
                  value={draftPhone.price}
                  onChange={(e) =>
                    setDraftPhone((prev) => (prev ? { ...prev, price: Number(e.target.value) || 0 } : prev))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Precio oferta</Label>
                <Input
                  className={fieldClassName("sale_price")}
                  type="number"
                  value={draftPhone.sale_price ?? ""}
                  onChange={(e) =>
                    setDraftPhone((prev) =>
                      prev ? { ...prev, sale_price: parseOptionalNumber(e.target.value) } : prev
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Almacenamientos (coma separada)</Label>
              <Input
                className={fieldClassName("storage_options")}
                value={draftPhone.storage_options?.join(", ") ?? ""}
                onChange={(e) =>
                  setDraftPhone((prev) =>
                    prev
                      ? {
                          ...prev,
                          storage_options: e.target.value
                            .split(",")
                            .map((p) => p.trim())
                            .filter(Boolean),
                        }
                      : prev
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea
                value={draftPhone.description ?? ""}
                onChange={(e) =>
                  setDraftPhone((prev) => (prev ? { ...prev, description: e.target.value || null } : prev))
                }
                className={`min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  fieldClassName("description")
                }`}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ruta imagen principal</Label>
                <Input
                  className={fieldClassName("images")}
                  value={draftPhone.images?.[0] ?? ""}
                  onChange={(e) =>
                    setDraftPhone((prev) =>
                      prev
                        ? {
                            ...prev,
                            images: [e.target.value, ...(prev.images?.slice(1) || [])].filter(Boolean),
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Reemplazar imagen (preview)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPreviewImage((old) => {
                      if (old) URL.revokeObjectURL(old);
                      return URL.createObjectURL(file);
                    });
                    setDraftPhone((prev) =>
                      prev
                        ? {
                            ...prev,
                            images: [`/images/fotos/${file.name}`, ...(prev.images?.slice(1) || [])],
                          }
                        : prev
                    );
                  }}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-bold text-lg mb-4">Especificaciones</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Pantalla</Label>
                    <Input
                      className={fieldClassName("display_size")}
                      value={draftPhone.display_size ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) => (prev ? { ...prev, display_size: e.target.value || null } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Cpu className="w-4 h-4" /> Procesador</Label>
                    <Input
                      className={fieldClassName("processor")}
                      value={draftPhone.processor ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) => (prev ? { ...prev, processor: e.target.value || null } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> RAM</Label>
                    <Input
                      className={fieldClassName("ram")}
                      value={draftPhone.ram ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) => (prev ? { ...prev, ram: e.target.value || null } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Cámara</Label>
                    <Input
                      className={fieldClassName("camera")}
                      value={draftPhone.camera ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) => (prev ? { ...prev, camera: e.target.value || null } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Battery className="w-4 h-4" /> Batería</Label>
                    <Input
                      className={fieldClassName("battery")}
                      value={draftPhone.battery ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) => (prev ? { ...prev, battery: e.target.value || null } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Lanzamiento</Label>
                    <Input
                      className={fieldClassName("release_year")}
                      type="number"
                      value={draftPhone.release_year ?? ""}
                      onChange={(e) =>
                        setDraftPhone((prev) =>
                          prev ? { ...prev, release_year: parseOptionalNumber(e.target.value) } : prev
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-6">
                  <div
                    className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                      isFieldEdited("is_featured") ? "bg-amber-100/60 border border-amber-400/60" : ""
                    }`}
                  >
                    <Checkbox
                      id="detail-is-featured"
                      checked={draftPhone.is_featured}
                      onCheckedChange={(checked) =>
                        setDraftPhone((prev) => (prev ? { ...prev, is_featured: checked === true } : prev))
                      }
                    />
                    <Label htmlFor="detail-is-featured">is_featured</Label>
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                      isFieldEdited("is_published") ? "bg-amber-100/60 border border-amber-400/60" : ""
                    }`}
                  >
                    <Checkbox
                      id="detail-is-published"
                      checked={draftPhone.is_published}
                      onCheckedChange={(checked) =>
                        setDraftPhone((prev) => (prev ? { ...prev, is_published: checked === true } : prev))
                      }
                    />
                    <Label htmlFor="detail-is-published">is_published</Label>
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
