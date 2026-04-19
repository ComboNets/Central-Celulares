import { Navbar } from "@/components/Navbar";
import { usePhone } from "@/hooks/usePhones";
import { useWhatsAppNumber, generateWhatsAppLink } from "@/hooks/useSettings";
import { trackEvent } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, ArrowLeft, Battery, Cpu, Camera, HardDrive, Monitor, Calendar } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";

export default function PhoneDetail() {
  const { id } = useParams();
  const { data: phone, isLoading } = usePhone(id);
  const { data: whatsappNumber } = useWhatsAppNumber();

  useEffect(() => {
    if (id) {
      trackEvent("product_view", id);
    }
  }, [id]);

  const handleWhatsAppClick = () => {
    if (!phone) return;

    trackEvent("whatsapp_click", phone.id);
    const whatsappLink = generateWhatsAppLink(whatsappNumber ?? "", phone.model);
    const whatsappWindow = window.open(whatsappLink, "_blank", "noopener,noreferrer");

    if (!whatsappWindow) {
      window.location.href = whatsappLink;
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

  if (!phone) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Celular no encontrado</h1>
          <Link to="/catalog">
            <Button>Volver al catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = phone.sale_price && phone.sale_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.sale_price!) / phone.price) * 100)
    : 0;

  const specs = [
    { icon: Monitor, label: "Pantalla", value: phone.display_size },
    { icon: Cpu, label: "Procesador", value: phone.processor },
    { icon: HardDrive, label: "RAM", value: phone.ram },
    { icon: Camera, label: "Camera", value: phone.camera },
    { icon: Battery, label: "Batería", value: phone.battery },
    { icon: Calendar, label: "Lanzamiento", value: phone.release_year?.toString() },
  ];

  const baseUrl = import.meta.env.BASE_URL || "/";
  const rawImages = Array.isArray(phone.images) ? phone.images : [];
  const resolvedImages = rawImages
    .filter(Boolean)
    .map((raw) => {
      if (raw.startsWith("http")) return raw;
      return `${baseUrl.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
    });
  const mainImage = resolvedImages[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={phone.model} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {phone.is_featured && <span className="featured-badge">Destacado</span>}
              {hasDiscount && <span className="sale-badge">-{discountPercent}% dto.</span>}
            </div>
            {mainImage && (
              <a
                href={mainImage}
                target="_blank"
                rel="noreferrer"
                download
                className="absolute bottom-4 right-4 rounded-md bg-background/80 px-3 py-2 text-xs font-medium text-foreground shadow"
              >
                Abrir foto
              </a>
            )}
          </div>

          {/* Details */}
          <div>
            <p className="text-primary font-medium uppercase tracking-wide mb-2">
              {phone.brand?.name}
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{phone.model}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              {hasDiscount ? (
                <>
                  <span className="text-4xl font-bold text-primary">
                    ${phone.sale_price?.toFixed(2)}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    ${phone.price.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-bold">${phone.price.toFixed(2)}</span>
              )}
            </div>

            {phone.storage_options && phone.storage_options.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Opciones de almacenamiento</p>
                <div className="flex flex-wrap gap-2">
                  {phone.storage_options.map((storage) => (
                    <Badge key={storage} variant="outline" className="text-sm px-3 py-1">
                      {storage}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-muted-foreground mb-8">{phone.description}</p>

            <Button onClick={handleWhatsAppClick} size="lg" className="btn-whatsapp w-full md:w-auto">
              <MessageCircle className="w-5 h-5" />
              Contactar por WhatsApp
            </Button>

            <Separator className="my-8" />

            {/* Specs */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-bold text-lg mb-4">Especificaciones</h3>
                <div className="grid grid-cols-2 gap-4">
                  {specs.map(({ icon: Icon, label, value }) =>
                    value ? (
                      <div key={label} className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium">{value}</p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}